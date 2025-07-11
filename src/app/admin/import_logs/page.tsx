"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LogEntry = {
  id: number;
  table_name: string;
  file_name: string;
  success_count: number;
  error_count: number;
  import_type: string;
  created_at: string;
};

export default function ImportLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch("/api/admin/import-logs");
      const data = await res.json();
      setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Import Logs</h1>

      {loading ? (
        <p>Loading logs…</p>
      ) : logs.length === 0 ? (
        <p>No import logs available.</p>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.table_name}</TableCell>
                    <TableCell className="truncate max-w-[200px]">
                      {log.file_name}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {log.success_count}
                    </TableCell>
                    <TableCell
                      className={log.error_count > 0 ? "text-red-600" : ""}>
                      {log.error_count}
                    </TableCell>
                    <TableCell>{log.import_type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
