import { useCallback, useRef } from "react";

type LongPressOptions = {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
};

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
}: LongPressOptions) {
  const LONG_PRESS_CANCEL_THRESHOLD = 16;
  const CLICK_SUPPRESS_THRESHOLD = 6;
  const TOUCH_MOUSE_GUARD_MS = 700;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const movedRef = useRef(false);
  const isPressActiveRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchEndAtRef = useRef(0);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const isTouchEvent = "touches" in e;

      // Ignore emulated mouse events shortly after touch.
      if (!isTouchEvent && Date.now() - lastTouchEndAtRef.current < TOUCH_MOUSE_GUARD_MS) {
        return;
      }

      if (!isTouchEvent && "button" in e && e.button !== 0) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (isTouchEvent) {
        startPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else {
        startPosRef.current = {
          x: e.clientX,
          y: e.clientY,
        };
      }

      isLongPressRef.current = false;
      movedRef.current = false;
      isPressActiveRef.current = true;
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
        // Vibrate on supported devices
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current) return;

    let x: number;
    let y: number;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }

    const dx = Math.abs(x - startPosRef.current.x);
    const dy = Math.abs(y - startPosRef.current.y);

    // Any meaningful drag/scroll gesture should suppress click on release.
    if (dx > CLICK_SUPPRESS_THRESHOLD || dy > CLICK_SUPPRESS_THRESHOLD) {
      movedRef.current = true;
    }

    // Larger movement cancels pending long-press.
    if (dx > LONG_PRESS_CANCEL_THRESHOLD || dy > LONG_PRESS_CANCEL_THRESHOLD) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const isTouchEvent = "changedTouches" in e;

      if (!isPressActiveRef.current) {
        return;
      }

      if (!isTouchEvent && "button" in e && e.button !== 0) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Only trigger click if it wasn't a long press or scroll/drag movement.
      if (!isLongPressRef.current && !movedRef.current && onClick) {
        onClick();
      }

      if (isTouchEvent) {
        lastTouchEndAtRef.current = Date.now();
      }

      // Prevent ghost click after long press on touch devices.
      if (isLongPressRef.current && isTouchEvent) {
        e.preventDefault();
      }

      startPosRef.current = null;
      movedRef.current = false;
      isPressActiveRef.current = false;
    },
    [onClick]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    movedRef.current = false;
    isPressActiveRef.current = false;
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: cancel,
  };
}