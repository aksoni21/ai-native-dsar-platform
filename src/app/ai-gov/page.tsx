import { redirect } from 'next/navigation';
import { ROUTE_PREFIX } from '@/lib/ai-gov/constants';

export default function AiGovIndexPage() {
  redirect(`${ROUTE_PREFIX}/inbox`);
}
