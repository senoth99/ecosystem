export default function Badge({ label, color = '#0A5C34', small = false }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: small ? '2px 8px' : '3px 10px',
      border: `1px solid ${color}`,
      background: '#1A1F1C',
      color: color,
      fontSize: small ? '10px' : '11px',
      letterSpacing: '0.1em',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      textTransform: 'uppercase',
    }}>
      <span style={{
        width: small ? '5px' : '6px',
        height: small ? '5px' : '6px',
        background: color,
        flexShrink: 0,
      }} />
      {label}
    </span>
  )
}
