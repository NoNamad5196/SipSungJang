"use client";
import { useEffect } from "react";
import { useJournal } from "@/components/JournalProvider";
import { TodayScreen } from "@/components/Quests";
export default function Page() {
  const { setEditor } = useJournal();
  useEffect(() => {
    setEditor({ kind: "game" });
  }, [setEditor]);
  return <TodayScreen />;
}
