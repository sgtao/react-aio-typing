import { useEffect, useState } from "react";

import AppHeader from './components/AppHeader';
import SignInSide from './components/SignInSide';
import AioMain from './components/AioMain';
import { auth } from "./firebase";

function App() {
  const [userName, setUserName] = useState("");
  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        setUserName(user.displayName);
      } else setUserName("");
    });
  }, []);

  return (
    <div className="App">
      <AppHeader></AppHeader>
      <main>
        {(userName === "")
          ? <SignInSide />
          : <AioMain />
        }
      </main>
    </div>
  );
}

export default App;
