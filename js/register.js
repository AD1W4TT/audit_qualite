const form = document.getElementById('registerForm');
const displayNameInput = document.getElementById('displayName');
const usernameInput = document.getElementById('regUsername');
const passwordInput = document.getElementById('regPassword');
const errorBox = document.getElementById('registerError');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.style.display = 'none';
  const payload = {
    display_name: displayNameInput.value.trim(),
    username: usernameInput.value.trim(),
    password: passwordInput.value,
  };
  try {
    const res = await fetch('api/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Inscription impossible');
    }
    window.location.href = 'index.php';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
});
