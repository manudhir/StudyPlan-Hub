(async () => {
  try {
    const registerRes = await fetch('http://localhost:5174/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Route Test', email: 'route-test@example.com', password: 'secret123' }),
    });
    console.log('REGISTER STATUS', registerRes.status);
    console.log(await registerRes.text());

    const loginRes = await fetch('http://localhost:5174/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'route-test@example.com', password: 'secret123' }),
    });
    console.log('LOGIN STATUS', loginRes.status);
    const loginData = await loginRes.json();
    console.log(loginData);
    const token = loginData.data?.accessToken;

    if (!token) {
      console.error('No token returned');
      return;
    }

    const profileRes = await fetch('http://localhost:5174/api/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('PROFILE STATUS', profileRes.status);
    console.log(await profileRes.text());
  } catch (error) {
    console.error(error);
  }
})();
