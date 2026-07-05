export function getE2ECredentials() {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function hasConfiguredBusiness() {
  return process.env.E2E_TEST_HAS_BUSINESS === "true";
}

export function getPublicBusinessId() {
  return process.env.E2E_PUBLIC_BUSINESS_ID?.trim() || null;
}