export const globalAnimationCSS = `
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .card-enter {
    animation: slideUp 0.35s ease both;
  }
  .card-enter:nth-child(1) { animation-delay: 0.00s; }
  .card-enter:nth-child(2) { animation-delay: 0.05s; }
  .card-enter:nth-child(3) { animation-delay: 0.10s; }
  .card-enter:nth-child(4) { animation-delay: 0.15s; }
  .card-enter:nth-child(5) { animation-delay: 0.20s; }

  .photo-enter {
    animation: slideUp 0.3s ease both;
  }

  .fade-in {
    animation: fadeIn 0.25s ease both;
  }

  button {
    transition: transform 0.12s ease, opacity 0.12s ease;
  }
  button:active {
    transform: scale(0.97);
  }
`
