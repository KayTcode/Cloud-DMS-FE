export const login = async (payload) => {
  const response = await fetch('/api/User/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data && data.message
        ? data.message
        : 'Invalid email or password.',
    );
  }

  return data;
};