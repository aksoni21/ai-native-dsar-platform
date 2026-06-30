# Seed Data — Edge Cases for Demo

A field guide to the 20 synthetic personas in our seed data and the DSAR pain points each one demonstrates. Use this when scripting demo flows for Margaret, Henry, or anyone else who needs to see the matching/disposition engine handle real-world complexity.

All data lives in Postgres under the `dwh`, `crm`, `marketing`, `dealer_dms`, and `vehicle_telematics` schemas. The seed migration is `f2a3b4c5d6e7_seed_demo_data.py`. Re-seed with `alembic downgrade e1f2a3b4c5d6 && alembic upgrade head`.

---

## Quick reference

| # | Persona | State | Edge case | Difficulty |
|---|---|---|---|---|
| 01 | Maria Chen          | CA | Clean cross-system match (baseline)         | easy |
| 02 | James Williams      | CT | Clean match, has warranty service event     | easy |
| 03 | Karen Lee           | CT | Clean match + rich coded inferred attrs     | easy |
| 04 | Robert Johnson      | CA | Clean match, recent purchase                | easy |
| 05 | Patricia Davis      | VA | Multi-purchase, household head              | easy |
| 06 | **Sofia Chen**      | VA | Maiden-name change (was Rodriguez)          | **hard** |
| 07 | **John Smith**      | TX | Email changed when employer changed         | **hard** |
| 08 | **Emily Nakamura**  | CA | Telematics-only — sold the car, registration lingers | **hard** |
| 09 | Aisha Patel         | CA | Marketing-only — dealer-event signup, no purchase | medium |
| 10 | Thomas Wilson       | VA | Household head — spouse Linda on same account | medium |
| 11 | Linda Wilson        | VA | Spouse — deletion of Thomas must NOT affect her | **hard** |
| 12 | **Michael Torres**  | CA | "Mike" in DMS — nickname / fuzzy name       | **hard** |
| 13 | Angela Martinez     | CA | Multi-VIN owner (her car + teen's car)      | medium |
| 14 | Jamie O'Brien       | CT | Same phone, four different formats          | medium |
| 15 | John Brown (TX)     | TX | Namesake collision                          | **hard** |
| 16 | John Brown (FL)     | FL | Different person, same name                 | **hard** |
| 17 | **David Brown**     | TX | Unsubscribed — CAN-SPAM retention exemption | **hard** |
| 18 | **Carmen Rios**     | CA | DMS-only consumer, never enrolled in telematics | **hard** |
| 19 | Hiroshi Tanaka      | CA | Parent of minor with no records             | medium |
| 20 | Diane Phillips      | VA | Rich coded inferred attrs (decode showcase) | easy |

The **bold** ones are the ones worth demoing — they each break a naive matcher in a different way.

---

## Sofia Chen — maiden-name change (the headline scenario)

**The story.** Sofia married in 2022 and changed her last name from Rodriguez to Chen. CRM caught the change (`crm.contact.previous_last_name = 'Rodriguez'`). Marketing did not — she's still in `marketing.subscriber` under `sofia.rodriguez.com`. DMS has *both* names attached to the same VIN over different service dates: the 2023 collision repair was logged when she was Rodriguez; the 2024 oil change was logged when she was Chen.

**Demo submission:**
```
First name:   Sofia
Last name:    Chen
Email:        sofia.chen.com
Phone:        571-555-0202
State:        VA
Other emails you may have used:  sofia.rodriguez.com
Details:      I changed my last name from Rodriguez to Chen after marriage in 2022.
Type:         Delete
```

**What the matcher should find:**
- 1 record in `dwh.customer_main` (party_id `a1000006-...`)
- 1 record in `crm.contact` (id `003C006`)
- 1 record in `marketing.subscriber` under the OLD email (subscriber_id 6)
- 2 records in `dealer_dms.service_record` (one as Rodriguez, one as Chen)
- 1 record in `vehicle_telematics.vin_registration`

**Why it's interesting.** A naive matcher querying `WHERE last_name='Chen' AND email='sofia.chen.com'` would miss the marketing row entirely. It needs to follow the `previous_last_name` trail in CRM, then probe marketing with the old email. The audit trail has to explain why both rows belong to the same person.

**Correct disposition:**
- Delete CRM, DWH, telematics, both DMS service records (no exemptions)
- Delete the marketing subscriber + send history, but **keep the suppression record** under CAN-SPAM evidence retention (this is the David Brown scenario applied here)
- Mask, don't delete, the 2023 collision repair invoice if there's an active warranty claim — let the rules engine decide

---

## Two John Browns — namesake collision

**The story.** Two real, different people both named John Brown. One in Texas (jbrown1.com), one in Florida (jbrown.fl.com). They have nothing in common except the name. The Texas John submits a DSAR.

**Demo submission:**
```
First name:   John
Last name:    Brown
Email:        john.brown1.com
Phone:        512-555-1717
State:        TX
Type:         Right to know
```

**What the matcher should find:**
- The TX John in `dwh.customer_main`, `crm.contact`, `dealer_dms.service_record`
- The FL John in `dwh.customer_main`, `crm.contact`, `dealer_dms.service_record` — but it should NOT include him

**Why it's interesting.** Lexical name match alone returns both. The matching engine has to weight email + state + phone signals to exclude the FL John. If the engine is too lenient, the demo fails — Margaret's worst nightmare is disclosing one customer's data to a different customer with the same name.

**Correct disposition:** Include ONLY the TX John's records; explicitly exclude the FL John with reasoning.

---

## Mike Torres — nickname/fuzzy name

**The story.** Michael Torres has CRM and DWH records under "Michael." But when he came in for roadside towing in 2023, the DMS rep typed "Mike" because that's what he goes by. Same email, same phone, same VIN.

**Demo submission:**
```
First name:   Michael
Last name:    Torres
Email:        mtorres.com
Phone:        213-555-0808
State:        CA
Type:         Delete
```

**What the matcher should find:**
- DWH/CRM/marketing/telematics rows under "Michael" (exact match)
- DMS row `DMS-009` under "Mike" — the only nickname variant in the seed

**Why it's interesting.** A strict `first_name = 'Michael'` filter misses the DMS row. The matcher needs nickname-aware matching (Michael ↔ Mike, Robert ↔ Bob, William ↔ Bill, etc.) OR — more defensibly — to fall back on email/phone/VIN match when the first_name doesn't agree.

**Correct disposition:** Include the Mike Torres row. The audit reasoning should cite the email + VIN match as the linkage signal, not the nickname assumption.

---

## David Brown — CAN-SPAM retention exemption

**The story.** David unsubscribed from marketing in November 2024 after a spam complaint. His subscriber row exists with `status='suppressed'`. There's a row in `marketing.suppression` with `retention_required_until = 2029-11-10`. Now he submits a deletion request.

**Demo submission:**
```
First name:   David
Last name:    Brown
Email:        david.brown.com
Phone:        972-555-1010
State:        TX
Type:         Delete
```

**What the matcher should find:**
- DWH, CRM, marketing rows
- Loyalty membership (status `inactive`)
- Suppression row with retention requirement

**Why it's interesting.** Right to delete vs. CAN-SPAM evidence retention is a real legal collision. The disposition engine has to:
- Delete the marketing.subscriber, send_history, engagement_event, and loyalty_member rows
- **Retain** the marketing.suppression row until 2029-11-10 (CAN-SPAM evidence that we honored the unsubscribe)
- Delete CRM/DWH freely (no comparable exemption)

The demo shows the audit trail explicitly citing the federal retention requirement.

---

## Emily Nakamura — telematics-only, lingering registration

**The story.** Emily owned a car for years, sold it in early 2025. She never had a CRM relationship (probably bought used from a private seller). Her telematics registration was never cancelled — the VIN is still attached to her email and name. The buyer never re-registered.

**Demo submission:**
```
First name:   Emily
Last name:    Nakamura
Email:        emily.nakamura.com
Phone:        415-555-0505
State:        CA
Type:         Delete
```

**What the matcher should find:**
- 1 row in `dwh.customer_main` (no source-system mapping populated)
- 1 row in `vehicle_telematics.vin_registration`
- 1 row in `vehicle_telematics.trip_event` (her old commute pattern)
- Nothing in CRM, marketing, DMS

**Why it's interesting.** Telematics holds privacy-sensitive trip data — start/end coordinates, hard-brake events, speed. Even after a car sale, that data attached to a name/email is a privacy liability. The disposition decision has to:
- Delete the trip_event rows (her data, her right)
- Decide what to do with vin_registration — delete it or just unlink her (the new owner might want to claim the VIN)

This also surfaces a real ops problem: telematics records should auto-expire on title transfer.

---

## Carmen Rios — DMS-only consumer

**The story.** Carmen bought a 2020 sedan, gets it serviced regularly at her dealer, but never enrolled in connected services and never opted in to marketing. The dealer's DMS is the ONLY system that has any record of her.

**Demo submission:**
```
First name:   Carmen
Last name:    Rios
Email:        carmen.rios.com
Phone:        408-555-1919
State:        CA
Type:         Right to know
```

**What the matcher should find:**
- 0 rows in DWH golden record (she never made it into the master)
- 0 rows in CRM, marketing, telematics
- 2 rows in `dealer_dms.service_record`
- 1 row in `dealer_dms.repair_invoice`

**Why it's interesting.** A DSAR pipeline that starts from DWH (`customer_main`) and fans out to other systems will return nothing. The matcher has to ALSO probe the source systems directly — the warehouse isn't authoritative, it's a derived view.

**Correct disposition:** Disclose the 2 DMS service records and the 1 invoice. The audit trail should note that the consumer is not in the warehouse and explain why (no marketing or CRM relationship).

---

## Wilson household — spouse data isolation

**The story.** Thomas and Linda Wilson share an account (`crm.account.id = 001H010`) and an address. Both have CRM contact records. Both have DMS service records (they each have their own VIN). Linda is on a separate marketing subscription Thomas isn't on. Thomas submits a deletion request.

**Demo submission:**
```
First name:   Thomas
Last name:    Wilson
Email:        twils.com
Phone:        804-555-1515
State:        VA
Type:         Delete
```

**What the matcher should find:**
- Thomas's rows: DWH, CRM contact `003C010`, telematics for `1HGBH41JXMN100010`, DMS for the same VIN, marketing subscriber 10 (already unsubscribed)
- Linda's rows: also under the same account_id, but DIFFERENT contact_id, email, phone, VIN

**Why it's interesting.** A naive "delete everything on account 001H010" deletes Linda too. The matcher has to:
- Recognize the household relationship
- Delete Thomas's rows
- Leave Linda's rows untouched
- NOT delete the household account itself (Linda still uses it)
- The dealer DMS row `DMS-008` is interesting — it's a service performed on Thomas's truck but BOOKED by Linda; that needs human judgment

**Correct disposition:** Delete only Thomas-attributed records. Mask Thomas's name on shared records. Flag the household-shared service for reviewer.

---

## Jamie O'Brien — phone format hell

**The story.** Same phone number, four different formats across systems. This is fully realistic — every system normalizes (or doesn't) differently:

| System | Format |
|---|---|
| `dwh.customer_main.primary_phone_e164` | `+12035552020` |
| `crm.contact.phone` | `(203) 555-2020` |
| `marketing.subscriber.phone` | `2035552020` |
| `dealer_dms.service_record.customer_phone` | `203.555.2020` |

**Demo submission:**
```
First name:   Jamie
Last name:    O'Brien
Email:        jamie.obrien.com
Phone:        (203) 555-2020
State:        CT
```

**Why it's interesting.** Phone-based identity match needs normalization. SQL `WHERE phone = '(203) 555-2020'` returns only the CRM row; the matcher has to strip non-digits and compare. Easy bug to write, easy to miss in testing — this case is here to make sure the engine handles it.

---

## Diane Phillips — coded inferred attributes (decode showcase)

**The story.** Diane has a fully populated `dwh.inferred_attributes` row with every coded field set. When she files a "right to know" request, the response has to include those inferences in plain English, not raw codes — that's what CCPA §1798.110 requires.

**Demo submission:**
```
First name:   Diane
Last name:    Phillips
Email:        diane.phillips.com
State:        VA
Type:         Right to know
```

**What the matcher should find — and the decode pipeline must translate:**

| Code field | Raw value | Decoded |
|---|---|---|
| `income_band_cd`     | H     | $200,000+ |
| `marketing_seg_cd`   | URB-A | Urban Affluent |
| `vehicle_segment_cd` | SUV-L | Large SUV |
| `age_range_cd`       | 4     | 35–44 |
| `education_cd`       | 5     | Graduate degree |
| `occupation_cd`      | EXE   | Executive |
| Plus: `churn_score`, `ltv_estimate_usd`, `propensity_to_buy_score`, `model_version`. |

**Why it's interesting.** This is Henry's coded-fields pain point made concrete. Without automated decoding, his team reads through coded values manually using a cipher table. Per record, that's 30-45 minutes of work. The demo shows the decode happening automatically and surfacing the decoded inferences in the report alongside the raw values for transparency.

---

## John Smith — email change with employer change

**The story.** John switched jobs in early 2024. Updated his primary email in CRM (`john.smith.com`). Marketing has both — the old `jsmith.com` (subscriber 7) AND the new `john.smith.com` (subscriber 21) — never reconciled. DWH still has the old email as primary.

**Demo submission:**
```
First name:   John
Last name:    Smith
Email:        john.smith.com
Other emails you may have used:  jsmith.com
State:        TX
Type:         Right to know
```

**Why it's interesting.** Two marketing rows for the same person. A naive matcher queries on `email` and finds only the new one. The "other emails" field on the form is the breadcrumb — but the engine has to know to use it.

**Correct disposition:** Include both subscriber rows; flag the duplicate to the human reviewer; note that the data team has a reconciliation gap to fix.

---

## Angela Martinez — multi-VIN owner

**The story.** Angela owns two cars — her main vehicle (2022 SUV-XL) and her teen driver's car (2024 Sedan, recently bought). Both VINs registered under her email. Both have telematics enrollments. Both have DMS service histories.

**Demo submission:** straight delete request from Angela.

**Why it's interesting.** The matcher has to find both VINs, both purchase records, both service histories — and the report should organize them by vehicle for clarity. Also: the teen driver's trip data is technically Angela's data (registered under her account) but the trip is the teen's behavior — privacy-questionable to surface in a deletion summary the parent will see. Hand-wavy, but a real-world consideration.

---

## Aisha Patel — marketing-only

**The story.** Aisha attended a dealer event in 2024. Filled out a sweepstakes form. Got added to the marketing list. Never bought a car.

**Demo submission:**
```
First name:   Aisha
Last name:    Patel
Email:        aisha.patel.com
State:        CA
Type:         Delete
```

**Why it's interesting.** She's not in CRM, DMS, telematics, or DWH. The matcher reaches the marketing row only — and that's the right answer. A demo flow can show a "single-system" finding alongside the multi-system ones.

---

## Hiroshi Tanaka — parent of minor with no records

**The story.** Hiroshi files a DSAR on behalf of his 14-year-old son. The son has no records anywhere — no CRM contact, no marketing subscription, no telematics enrollment.

**Demo submission:**
```
Requester:        My minor child
First name:       (child's name)
Last name:        Tanaka
Parent's email:   hiroshi.tanaka.com
State:            CA
Type:             Right to know
```

**Why it's interesting.** Empty result with parental verification still required. The demo flow exercises the "no records found, here's how we verified the parent's authority and confirmed nothing exists" code path — which is its own legal communication, not just a 404.

---

## Patricia Davis — multi-purchase household head

**The story.** Patricia has bought two cars (a 2021 SUV-XL and a 2024 Sedan), has a recall service in her history, is platinum loyalty tier, and is the head of a multi-person household. Clean cross-system data, but lots of it.

**Use this for:** showing the volume side of a DSAR — what a 5-year customer's data actually looks like assembled.

---

## How to demo

The form-submission flow that exists today writes to `naica_demo.intake_requests` only. To demo any edge case end-to-end you need either:

1. **The chat agent at `/demo`** — once it's wired to query the source schemas, Margaret can ask "what do we have on Sofia Chen?" and the LLM walks through the systems live.
2. **The intake pipeline** — once re-added (Tier 2 hybrid: deterministic SQL fan-out + LLM scoring/disposition), submitting the form actually runs the matching engine against the seeded data.

Until either is wired, you can still query the data directly via psql / Supabase Studio to validate matchers in isolation, and the schema variety in the seed makes that worthwhile.

---

## Re-seeding

```bash
cd migrations
source .venv/bin/activate
alembic downgrade e1f2a3b4c5d6   # truncates source schemas
alembic upgrade head             # re-applies the seed
```

If you change the seed migration in place (rather than adding a new one), do the downgrade first or you'll hit duplicate-key errors.
