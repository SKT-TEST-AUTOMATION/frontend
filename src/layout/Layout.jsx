import AppShell from "./AppShell";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const user = { firstName: '홍', name: '홍길동', avatarUrl: '' };
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}