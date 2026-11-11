import { ButtonLink, Eyebrow } from '../components/ContentBlocks.jsx';

export default function NotFoundPage() {
  return <section className="shell not-found-page"><span className="not-found-mark" aria-hidden="true">404</span><Eyebrow>That page wandered off</Eyebrow><h1>Let’s find our way <em>back.</em></h1><p>The page you’re looking for may have moved or may not exist.</p><ButtonLink to="/">Go to the homepage</ButtonLink></section>;
}
