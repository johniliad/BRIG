import { useBrig } from '../state/BrigContext';
import { BRAND_NAME } from '../data/demo';
import { SectionCard } from '../ui/components';

export function DisclaimerPage() {
  const { dispatch } = useBrig();
  return (
    <div className="page prose-page">
      <button className="link-btn no-print" onClick={() => dispatch({ type: 'SET_STEP', step: 'landing' })}>← Home</button>
      <h1>Disclaimers</h1>
      <p className="lead">
        {BRAND_NAME} is a demonstration of automated Board presentation and storytelling built from
        cybersecurity metrics. Please read the statements below carefully before relying on any output.
      </p>

      <SectionCard title="This is a demonstration">
        <p>
          <strong>
            This application is a demonstration (demo) of a way to create Board presentations and storytelling
            quickly and automatically from cybersecurity metrics. It is not a professional assessment, and it
            must not be relied upon for real-world security, risk, investment, legal or governance decisions.
          </strong>
        </p>
        <ul className="tick-list">
          <li>It illustrates what can be produced rapidly from structured metrics; it does not perform expert analysis.</li>
          <li>Professional users should always engage qualified experts when preparing Board and executive reports.</li>
          <li>Do not rely on an automated tool such as this in place of independent expert help, review and judgement.</li>
          <li>Outputs are illustrative by design and should be reviewed and, where necessary, rewritten by a responsible professional.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Not an audit, certification or advice">
        <ul className="tick-list">
          <li>It is not a cybersecurity audit or certification.</li>
          <li>It is not legal advice or regulatory advice.</li>
          <li>It is not a formal compliance determination.</li>
          <li>It is not a substitute for professional judgement, expert help or independent assurance.</li>
          <li>It is not endorsed by, or affiliated with, any employer, regulator or standards body.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Data & inferences">
        <p>
          Results depend on the quality and completeness of user-provided information. Inferred relationships
          are analytical signals, not proof of causality, and conclusions may be wrong if the underlying data is
          inaccurate, incomplete or not comparable. Users remain responsible for validating any material
          decision. Optional third-party AI processing should be considered before entering sensitive
          information.
        </p>
      </SectionCard>

      <SectionCard title="Export handling">
        <p>
          PDF, PowerPoint and JSON exports may contain sensitive metrics. Handle them according to your
          organisation's information-classification policy. Do not upload exports to a third-party service
          automatically, and treat generated files as draft material pending expert review.
        </p>
      </SectionCard>

      <SectionCard title="Framework references">
        <p>
          Where recognised frameworks are mentioned (e.g. NIST Cybersecurity Framework, ISO/IEC 27001, CIS
          Controls), this does not imply certification, official mapping or endorsement.
        </p>
      </SectionCard>

      <SectionCard title="No reliance">
        <p>
          <strong>
            By using this application you accept that it is provided for demonstration and educational purposes
            only, without warranty of any kind.
          </strong>{' '}
          Nothing in its output constitutes professional advice, and you must not rely on it as such. Always
          obtain independent advice from appropriately qualified professionals before making decisions or
          presenting findings to a Board of directors.
        </p>
      </SectionCard>

      <p className="muted small">Final legal wording should be reviewed before production use.</p>
    </div>
  );
}
