// dummy.tsx
import type { ClientLoaderArgs } from "react-router";

// 1. loader ではなく clientLoader を使用する
export async function clientLoader({ request }: ClientLoaderArgs) {
  // ブラウザ上で Response オブジェクトを作成して返します
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// 2. SPAモードで最初にこのURLが叩かれた時に loader を動かすための設定
clientLoader.hydrate = true;

export default function Dummy() {
  // 3. 自分自身を呼び出すと無限ループでクラッシュするため、null を返します
  return null;
}
