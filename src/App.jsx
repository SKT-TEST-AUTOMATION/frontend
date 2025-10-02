import AppShell from './layout/AppShell';

function App() {
  const user = { name : '테스터', avatarUrl: ''};

  return (
    <AppShell user={user}>
    </AppShell>
  )
}

export default App
