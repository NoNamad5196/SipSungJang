"use client";
import type { CSSProperties, ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { percent } from "@/lib/model";
import type { PlayIntensity, PriorityRank } from "@/types";
export const STATUS_LABELS: Record<PlayIntensity, string> = {
  main: "메인",
  sub: "서브",
  "login-only": "접속만",
  frozen: "휴식",
  abandoned: "방치",
};
export const PRIORITY_LABELS: Record<PriorityRank, string> = {
  priority1: "핵심",
  priority2: "육성중",
  "on-hold": "대기",
  favorite: "애정캐",
  "bad-investment": "투자 보류",
  complete: "완료",
};
export function Panel({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={`panel ${className}`} style={style}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </section>
  );
}
export function SectionHeader({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <span aria-hidden="true">◆</span>
      <h2>{children}</h2>
      <i />
      {action}
    </div>
  );
}
export function Badge({ status }: { status: PlayIntensity }) {
  return (
    <span className={`badge status-${status}`}>{STATUS_LABELS[status]}</span>
  );
}
export function Progress({
  value,
  max,
  color = "#c9a84c",
  label = "진행률",
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const pct = percent(value, max);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
        }}
      />
    </div>
  );
}
export function Ring({
  value,
  color = "#c9a84c",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div
      className="progress-ring"
      style={
        {
          "--ring-color": color,
          "--ring-percent": `${value}%`,
        } as CSSProperties
      }
      aria-label={`완료율 ${value}%`}
    >
      <div>
        <strong>{value}%</strong>
        <small>완료율</small>
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        ◇
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <span className="loading-star">✦</span>
      <p>모험의 기록을 펼치는 중…</p>
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <Dialog.Title className="modal-title">◇ {title}</Dialog.Title>
          <Dialog.Description className="modal-description">
            {description}
          </Dialog.Description>
          <Dialog.Close className="close-button" aria-label="닫기">
            ×
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-notice" role="alert">
      <span>기록을 저장하지 못했어요. {message}</span>
      {onRetry && (
        <button className="button" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}
