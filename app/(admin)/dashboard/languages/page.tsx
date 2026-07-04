"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LanguagesContent, UIOverridesContent } from "@/components/admin/languages"

export default function LanguagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Langues</h1>
        <p className="text-muted-foreground">
          Configurez les langues disponibles et les traductions de votre
          restaurant.
        </p>
      </div>

      <Tabs defaultValue="languages">
        <TabsList>
          <TabsTrigger value="languages">Langues</TabsTrigger>
          <TabsTrigger value="overrides">Traductions UI</TabsTrigger>
        </TabsList>

        <TabsContent value="languages" className="mt-4">
          <LanguagesContent />
        </TabsContent>

        <TabsContent value="overrides" className="mt-4">
          <UIOverridesContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
