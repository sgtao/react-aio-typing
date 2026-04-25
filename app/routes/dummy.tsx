// dummy.tsx
import type { Route } from "./+types/dummy";

// このルートは Chrome DevTools 等のシステムリクエストを 404 にしないためのものです
export function loader() {
  // 200 OK と空の JSON を返します
  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
}

export default function Dummy() {
  // UIとして表示されることは想定していませんが、Reactのルールに従い null を返します
  return null;
}
