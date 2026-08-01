/**
 * "Powered by Minha Vez" badge shown on the free plan's customer-facing
 * screens (queue page + monitor). Removed on the Pro plan. Doubles as
 * organic marketing — links back to the app's landing page.
 *
 * variant: 'light' (on light backgrounds) | 'dark' (on the monitor).
 */
export default function PoweredBy({ variant = 'light' }) {
  return (
    <a
      className={`powered-by powered-by-${variant}`}
      href={window.location.origin + '/'}
      target="_blank"
      rel="noopener noreferrer"
    >
      Powered by <strong>Minha Vez</strong>
    </a>
  )
}
