import { databaseService } from "@traffboard/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Enable ISR with 1-hour revalidation for analytics overview
export const revalidate = 3600; // 1 hour in seconds

export default async function DashboardPage() {
  const [conversionsData, playersData] = await Promise.all([
    databaseService.conversions.getAggregates(),
    databaseService.players.count(),
  ]);

  const conversionRate = conversionsData.totalUniqueClicks > 0 
    ? (conversionsData.totalRegistrations / conversionsData.totalUniqueClicks) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Overview</h1>
        <p className="text-muted-foreground">Key performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionsData.totalUniqueClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique visitors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionsData.totalRegistrations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{conversionRate.toFixed(2)}% conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">First Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionsData.totalFtdCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{conversionsData.ftdRate.toFixed(2)}% FTD rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{playersData.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered players</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
