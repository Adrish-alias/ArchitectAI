import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const curRef = useRef(null);
  const cur2Ref = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (curRef.current) {
        curRef.current.style.left = e.clientX + 'px';
        curRef.current.style.top = e.clientY + 'px';
      }
    };
    document.addEventListener('mousemove', handleMove);

    let animId;
    const animate = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.13;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.13;
      if (cur2Ref.current) {
        cur2Ref.current.style.left = ring.current.x + 'px';
        cur2Ref.current.style.top = ring.current.y + 'px';
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <>
      <div id="cur" ref={curRef}></div>
      <div id="cur2" ref={cur2Ref}></div>
    </>
  );
}
