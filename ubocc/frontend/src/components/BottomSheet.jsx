export default function BottomSheet({ isOpen, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(3px)',
            zIndex: 800,
          }}
        />
      )}

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 900,
        background: 'linear-gradient(to bottom, #0f1929, #0a1120)',
        borderTop: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.7)',
        maxHeight: '72vh',
        overflowY: 'auto',
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{
            width: '36px', height: '4px',
            background: '#1e3a5f', borderRadius: '2px',
          }} />
        </div>

        {children}
      </div>
    </>
  )
}
