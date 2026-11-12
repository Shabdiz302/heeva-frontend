# Heeva AI Assistant — Cloudflare Worker

This Worker is the private server-side gateway between the GitHub Pages preview and OpenAI. The OpenAI key is a Cloudflare Worker secret, never a browser variable or repository file.

## Configuration

1. In Cloudflare Dashboard → Workers & Pages, create/deploy the Worker named `heeva-ai-assistant` from this directory, or use Wrangler from a trusted local terminal.
2. In the Worker settings → Variables and Secrets, add **Secret**:
   - Name: `OPENAI_API_KEY`
   - Value: your OpenAI project API key (enter it only in Cloudflare's secure dashboard; never paste it into ChatGPT or GitHub).
3. Deploy the Worker again after adding the secret.
4. Test `https://heeva-ai-assistant.<your-workers-dev-subdomain>.workers.dev/health`. It should return `{"ok":true,"service":"heeva-ai-assistant"}`.
5. The frontend currently expects `https://heeva-ai-assistant.a-r-ch.workers.dev`. If the account's workers.dev subdomain differs, change `API_URL` in `src/components/HeevaChat.jsx` to the actual URL and push a new Pages preview.

## Protection and cost controls

- OpenAI model: `gpt-6-luna` (configured in Worker code).
- Maximum generated output: 320 tokens per request.
- Maximum 10 recent messages and 5,200 total message characters per request.
- Rate limit binding: 8 requests per client session per 60 seconds. Cloudflare documents that this binding is approximate and locally enforced per Cloudflare location.
- Durable Object global cap: 100 requests per UTC day and 1,500 requests per UTC calendar month across the Worker. When either cap is reached, chat requests are blocked until the next reset window.
- With the current published GPT-6 Luna rates and these input/output caps, this is designed for a low-cost pilot; actual spend varies by tokenisation and model pricing. Also set a billing budget/alert in the OpenAI project dashboard. The request ceiling is a hard operational cap; it is not an exact dollar-denominated billing guarantee.

## Data and safety

- `store:false` is sent to the Responses API. The Worker does not persist chat transcripts.
- The UI keeps the short conversation in React memory only; it is not written to localStorage.
- The Worker accepts only the GitHub Pages preview origin and local development origins.
- The assistant cannot book, take payment, inspect student accounts or access private student records.
- It tells visitors that only one free initial lesson is offered.
- It provides WhatsApp and email handover.
- Do not put card details, passwords, children's identities or sensitive information into chat.

## Local development

From this directory, install Wrangler in a trusted local environment and run:

```powershell
pnpm dlx wrangler dev
```

Use a local `.dev.vars` file for `OPENAI_API_KEY` only on your own machine; never commit it. The committed `.dev.vars.example` contains no secrets.


## Deploy through GitHub Actions (recommended)

1. Create a Cloudflare API token with the **Edit Cloudflare Workers** permission, scoped to the Heeva Cloudflare account.
2. In GitHub → Settings → Secrets and variables → Actions, add repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. In Cloudflare → Workers & Pages → create/open `heeva-ai-assistant` → Settings → Variables and Secrets, add `OPENAI_API_KEY` as a **Secret** before deploying.
4. In GitHub → Actions → **Deploy Heeva AI Assistant** → Run workflow, choose branch `preview/github-pages`.
5. When deployment completes, check the Worker URL's `/health` endpoint.
6. Confirm that the Worker URL matches the URL configured in `src/components/HeevaChat.jsx`. If the account subdomain is not `a-r-ch`, update that frontend constant and push a new preview build.

The API key is entered only in the Cloudflare dashboard. The Cloudflare API token and account ID are stored as GitHub Actions secrets. Never commit them or paste them into chat.
