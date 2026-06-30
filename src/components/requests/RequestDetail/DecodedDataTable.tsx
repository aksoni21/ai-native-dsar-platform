import { Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { SystemBadge } from '@/components/ui/SystemBadge';
import { decodeField } from '@/lib/data';
import { getDataSourceMeta } from '@/lib/data-sources';
import type { RecordData } from '@/types';

interface DecodedDataTableProps {
  record: RecordData;
}

export default function DecodedDataTable({ record }: DecodedDataTableProps) {
  const codedFields = record.coded_fields;
  if (!codedFields || Object.keys(codedFields).length === 0) return null;

  const entries = Object.entries(codedFields);

  return (
    <Card data-tour="decoded-data">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5" />
          Decoded Data
          <span className="ml-auto flex items-center gap-2 text-xs font-normal text-muted-foreground">
            <SystemBadge sourceId={record.data_source} />
            {getDataSourceMeta(record.data_source).friendly_name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Raw Code</TableHead>
              <TableHead>Decoded Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([fieldName, code]) => {
              const decoded = decodeField(fieldName, code);
              return (
                <TableRow key={fieldName}>
                  <TableCell className="font-medium capitalize">
                    {fieldName.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {code}
                    </code>
                  </TableCell>
                  <TableCell>
                    {decoded || (
                      <span className="text-muted-foreground italic">
                        Unknown code
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
