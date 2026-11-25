const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;

const providers = issuer
  ? [
      {
        domain: issuer,
        applicationID: "convex",
      },
    ]
  : [];

export default { providers };
