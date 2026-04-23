import type { Route } from "./+types/home";
import { TypingGame } from "../components/TypingGame";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "aio-typing" },
    { name: "description", content: "ALL IN ONE タイピングゲーム" },
  ];
}

export default function Home() {
  return <TypingGame />;
}
