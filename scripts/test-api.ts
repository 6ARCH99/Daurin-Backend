async function main() {
  const loginRes = await fetch("http://127.0.0.1:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "putra.wijaya@email.com",
      password: "password123"
    })
  });

  const loginData = await loginRes.json() as any;
  if (!loginRes.ok) {
    console.error("Login failed:", loginData);
    return;
  }

  const token = loginData.token;
  console.log("Logged in successfully. Token length:", token.length);

  const dashRes = await fetch("http://127.0.0.1:3001/api/dashboard", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const dashData = await dashRes.json() as any;
  console.log("Dashboard response status:", dashRes.status);
  console.log("Dashboard Data:", JSON.stringify(dashData, null, 2));
}

main().catch(console.error);
