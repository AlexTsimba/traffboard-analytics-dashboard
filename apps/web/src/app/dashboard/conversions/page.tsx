import { databaseService } from "@traffboard/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ConversionsPage() {
  const [aggregates, recentConversions] = await Promise.all([
    databaseService.conversions.getAggregates(),
    databaseService.conversions.findAll(undefined, 10, 0),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conversions</h1>
        <p className="text-muted-foreground">Track clicks, registrations, and first deposits</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unique Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregates.totalUniqueClicks.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregates.totalRegistrations.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">First Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregates.totalFtdCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>FTD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentConversions.map((conversion) => (
                <TableRow key={conversion.id}>
                  <TableCell>{conversion.date}</TableCell>
                  <TableCell>{conversion.country}</TableCell>
                  <TableCell>{conversion.uniqueClicks}</TableCell>
                  <TableCell>{conversion.registrationsCount}</TableCell>
                  <TableCell>{conversion.ftdCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
