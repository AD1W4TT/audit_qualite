const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorBox = document.getElementById('loginError');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.style.display = 'none';
  const payload = {
    username: usernameInput.value.trim(),
    password: passwordInput.value,
  };
  try {
    const res = await fetch('api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Connexion impossible');
    }
    window.location.href = 'index.php';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
});
