type Props = {
  color?: string;
};

export default function LoadingDots({ color = 'var(--color-accent)' }: Props) {
  return (
    <span className="loading-dots" style={{ fontFamily: 'var(--font-mono)', color, letterSpacing: 4 }}>
      <span>·</span><span>·</span><span>·</span>
    </span>
  );
}
