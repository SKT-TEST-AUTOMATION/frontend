import AppShell from "./AppShell";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const user = { firstName: 'Q', name: '작업자', avatarUrl: '' };
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}