import { faqs } from '../data/faqs.js';
import { CTASection, PageIntro } from '../components/ContentBlocks.jsx';

export default function FaqPage() {
  return (
    <>
      <PageIntro eyebrow="Frequently asked questions" title={<>A few helpful <em>answers.</em></>}>
        <p>These answers use Heeva’s published course information and make clear what should be confirmed during a consultation.</p>
      </PageIntro>
      <section className="shell page-content faq-page-list">
        {faqs.map((faq, index) => <details className="faq-item" key={faq.question}><summary><span className="faq-index">{String(index + 1).padStart(2, '0')}</span><span>{faq.question}</span><span className="faq-plus" aria-hidden="true">+</span></summary><div className="faq-answer"><p>{faq.answer}</p></div></details>)}
      </section>
      <CTASection title="Still have a question?">Contact Heeva or bring it along to a free consultation.</CTASection>
    </>
  );
}
