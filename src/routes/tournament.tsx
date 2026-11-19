import { createFileRoute } from "@tanstack/react-router";

import { TournamentPage } from "@/components/tournament/TournamentPage";

export const Route = createFileRoute("/tournament")({
  component: TournamentPage,
});
