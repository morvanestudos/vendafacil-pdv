function Logo({ className = '', tone = 'light' }) {
  const classes = ['brand-logo', `brand-logo--${tone}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} aria-label="VendaFácil PDV">
      <span className="brand-logo__mark" aria-hidden="true">
        <span className="brand-logo__mark-core" />
      </span>
      <span className="brand-logo__text">VendaFácil PDV</span>
    </span>
  )
}

export default Logo
