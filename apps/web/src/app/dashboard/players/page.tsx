import { databaseService } from "@traffboard/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Enable ISR with 15-minute revalidation for recent players data
export const revalidate = 900; // 15 minutes in seconds

export default async function PlayersPage() {
  const recentPlayers = await databaseService.players.findAll(undefined, 10, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="text-muted-foreground">Player analytics and performance metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Players</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player ID</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Sign Up Date</TableHead>
                <TableHead>Deposits</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>{player.playerId}</TableCell>
                  <TableCell>{player.playerCountry}</TableCell>
                  <TableCell>{player.signUpDate}</TableCell>
                  <TableCell>${player.depositsSum}</TableCell>
                  <TableCell>
                    {player.prequalified ? "Qualified" : "Pending"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
