import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { ShieldCheck } from "lucide-react";
import { UsersTab } from "@/components/settings/UsersTab";
import { InvitationsTab } from "@/components/settings/InvitationsTab";
import { TrainingsTab } from "@/components/settings/TrainingsTab";
import { EnrollmentsTab } from "@/components/settings/EnrollmentsTab";

export default function Settings() {
  const { isAdminOrOwner, isMentor } = useUserRole();

  const showAllTabs = isAdminOrOwner;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            {showAllTabs ? "Configurações da Organização" : "Convites"}
          </h1>
        </div>

        {showAllTabs ? (
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="invitations">Convites</TabsTrigger>
              <TabsTrigger value="trainings">Treinamentos</TabsTrigger>
              <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
            </TabsList>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="invitations"><InvitationsTab /></TabsContent>
            <TabsContent value="trainings"><TrainingsTab /></TabsContent>
            <TabsContent value="enrollments"><EnrollmentsTab /></TabsContent>
          </Tabs>
        ) : (
          <InvitationsTab />
        )}
      </div>
    </AppLayout>
  );
}
