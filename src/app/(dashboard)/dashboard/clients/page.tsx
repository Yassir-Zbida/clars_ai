'use client';

import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export default function ClientsPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: clients, isLoading, error } = trpc.clients.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Erreur: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Gérez vos clients et contacts</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : 'Nouveau client'}
        </Button>
      </div>

      {showForm && (
        <ClientCreateForm onSuccess={() => setShowForm(false)} />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Aucun client pour le moment.</p>
              <Button className="mt-2" variant="outline" onClick={() => setShowForm(true)}>
                Ajouter un client
              </Button>
            </CardContent>
          </Card>
        ) : (
          clients?.map((client) => (
            <Card key={client.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{client.name}</CardTitle>
                <CardDescription>
                  {client.company ?? client.email ?? '—'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {client.healthScore != null && (
                  <p className="text-xs text-muted-foreground">
                    Score santé: {client.healthScore}/100
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function ClientCreateForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const utils = trpc.useUtils();
  const create = trpc.clients.create.useMutation({
    onSuccess: () => {
      void utils.clients.list.invalidate();
      onSuccess();
      setName('');
      setEmail('');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau client</CardTitle>
        <CardDescription>Renseignez au moins le nom</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="text"
          placeholder="Nom *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate({ name: name.trim(), email: email.trim() || undefined })}
          >
            {create.isPending ? 'Création...' : 'Créer'}
          </Button>
          <Button variant="outline" onClick={onSuccess}>
            Annuler
          </Button>
        </div>
        {create.error && (
          <p className="text-sm text-destructive">{create.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
