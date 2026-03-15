import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue sur votre CRM. Gérez vos clients, projets et factures.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Vos clients et contacts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">À configurer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projets</CardTitle>
            <CardDescription>Suivi des projets en cours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">À configurer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Factures</CardTitle>
            <CardDescription>Factures et encaissements</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">À configurer</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
