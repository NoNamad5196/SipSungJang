import { TodayScreen } from "@/components/Quests";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TodayScreen gameId={id} />;
}
