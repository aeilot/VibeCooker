"use client";

import { useI18n } from "@/components/i18n-provider";
import { useId } from "react";

/** Original SVG illustration: no remote assets, no generated dish photos. */
export function FoodArt({
  mood = "tomato",
  hero = false,
}: {
  mood?: "tomato" | "green" | "golden";
  hero?: boolean;
}) {
  const { locale, t: tr } = useI18n();
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className={hero ? "food-art hero-food" : "food-art"}
      viewBox="0 0 480 380"
      role="img"
      aria-label={tr("手绘番茄鸡蛋料理插画，非菜品实拍")}
    >
      <defs>
        <filter id={`shadow${id}`} x="-40%" y="-40%" width="180%" height="190%">
          <feDropShadow
            dx="0"
            dy="13"
            stdDeviation="12"
            floodColor="#5c5437"
            floodOpacity=".13"
          />
        </filter>
        <radialGradient id={`plate${id}`}>
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset=".78" stopColor="#fbf7ed" />
          <stop offset="1" stopColor="#e7e8d5" />
        </radialGradient>
        <linearGradient id={`yolk${id}`} x2=".8" y2="1">
          <stop stopColor="#ffd76c" />
          <stop offset="1" stopColor="#eeaa29" />
        </linearGradient>
      </defs>
      <g opacity=".8" stroke="#c8cdb6" strokeWidth="1" fill="none">
        <path d="M53 88l8-8m-3 18l12-12M399 295l12-12m-2 18l9-9" />
        <circle cx="386" cy="61" r="3" />
        <circle cx="64" cy="265" r="4" />
      </g>
      <ellipse
        cx="243"
        cy="199"
        rx="166"
        ry="153"
        fill="#f1e9d7"
        opacity=".5"
      />
      <g filter={`url(#shadow${id})`}>
        <ellipse
          cx="239"
          cy="184"
          rx="157"
          ry="147"
          fill={`url(#plate${id})`}
          stroke="#fffef8"
          strokeWidth="7"
        />
        <ellipse
          cx="239"
          cy="184"
          rx="127"
          ry="118"
          fill="#f8f3e5"
          stroke="#dddfc9"
          strokeWidth="2"
        />
        <ellipse
          cx="239"
          cy="184"
          rx="115"
          ry="106"
          fill={
            mood === "green"
              ? "#b7c68a"
              : mood === "golden"
                ? "#ead39c"
                : "#e5bd78"
          }
        />
        <g
          fill="none"
          stroke={mood === "green" ? "#e5df9f" : "#f6d690"}
          strokeWidth="8"
          strokeLinecap="round"
        >
          <path d="M151 154c85-77 151-34 144 0s-124-13-129 35 129 40 145-1-131-68-152 6 120 81 151 29" />
          <path d="M180 112c-59 83 111 4 131 58s-123 17-120 66 82 20 93 3" />
          <path d="M139 191c47-51 160 68 178 11s-78-58-65-103" />
        </g>
        <g fill="#e16c49" stroke="#f5a078" strokeWidth="3">
          <path d="M157 120q-28 0-31 24t38 13l19-25z" />
          <path d="M297 112q36-16 45 16t-25 28l-28-23z" />
          <path d="M146 227q-19 25 11 43t44-11l-21-27z" />
          <path d="M298 237q40-18 43 12t-27 25l-26-18z" />
        </g>
        <g stroke="#fbc199" strokeWidth="2">
          <path d="M143 132l19 10m158-17l-9 16m-157 103l24 8m132-2l10 9" />
        </g>
        <path
          d="M197 145c-24-28-49-6-43 21-26 19-15 51 15 50 6 27 33 34 52 19 34 22 64 2 60-25 24-25 6-56-19-53-11-30-47-32-65-12z"
          fill="#fffdf2"
          stroke="#efe9cd"
          strokeWidth="2"
        />
        <circle cx="216" cy="184" r="30" fill={`url(#yolk${id})`} />
        <path
          d="M200 177q3-12 16-13"
          fill="none"
          stroke="#ffe69a"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <g fill="#70975c" stroke="#5a814c" strokeWidth="1.2">
          <path d="M276 191q-4-34 28-32 8 25-28 32z" />
          <path d="M278 193q31-21 39 9-22 14-39-9z" />
          <path d="M273 195q-22-26-35-6 6 24 35 6z" />
        </g>
        <g fill="#477752">
          <rect
            x="171"
            y="174"
            width="9"
            height="3"
            rx="1"
            transform="rotate(-30 171 174)"
          />
          <rect
            x="233"
            y="236"
            width="9"
            height="3"
            rx="1"
            transform="rotate(24 233 236)"
          />
          <rect x="292" y="165" width="8" height="3" rx="1" />
          <rect
            x="207"
            y="124"
            width="8"
            height="3"
            rx="1"
            transform="rotate(50 207 124)"
          />
          <rect x="257" y="213" width="7" height="3" rx="1" />
        </g>
        <g fill="#796747">
          <circle cx="233" cy="153" r="1.4" />
          <circle cx="196" cy="213" r="1.4" />
          <circle cx="248" cy="182" r="1.2" />
          <circle cx="185" cy="161" r="1.4" />
          <circle cx="218" cy="225" r="1.2" />
        </g>
      </g>
      <g
        transform="rotate(22 421 190)"
        fill="none"
        stroke="#a88762"
        strokeLinecap="round"
      >
        <path d="M420 123v160" strokeWidth="8" />
        <path
          d="M407 79v37q0 16 13 16t13-16V79m-17 0v40m9-40v40"
          strokeWidth="4"
        />
      </g>
      <g transform="translate(82 307) rotate(-25)" fill="#779264">
        <path d="M0 0q-29-42-44-8Q-32 13 0 0z" />
        <path d="M1 0q9-43 30-23Q38-2 1 0z" />
        <path d="M0 0q-2-36-21-34Q-33-16 0 0z" />
      </g>
      {hero && (
        <g fill="none" stroke="#d3a75e" strokeWidth="2.5" strokeLinecap="round">
          <path d="M90 60v14m-7-7h14M371 327v12m-6-6h12" />
        </g>
      )}
    </svg>
  );
}

export function PotMascot({ small = false }: { small?: boolean }) {
  const { locale, t: tr } = useI18n();
  return (
    <svg
      className={small ? "pot-mascot small" : "pot-mascot"}
      viewBox="0 0 120 110"
      role="img"
      aria-label={tr("小汤锅料理搭子")}
    >
      <path
        d="M42 23q-9-9 0-15m20 15q-9-9 0-15m19 15q-9-9 0-15"
        fill="none"
        stroke="#b7bea1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M25 49H12q-8 12 8 13h7m68-13h13q8 12-8 13h-7"
        fill="none"
        stroke="#56784b"
        strokeWidth="7"
      />
      <path
        d="M25 43h70v30q0 24-35 24T25 73z"
        fill="#b2c29a"
        stroke="#56784b"
        strokeWidth="3"
      />
      <path
        d="M19 42q41-25 82 0z"
        fill="#e1e6cf"
        stroke="#56784b"
        strokeWidth="3"
      />
      <rect x="51" y="21" width="18" height="9" rx="4" fill="#56784b" />
      <circle cx="46" cy="67" r="3" fill="#3f5235" />
      <circle cx="74" cy="67" r="3" fill="#3f5235" />
      <path
        d="M54 74q6 6 12 0"
        fill="none"
        stroke="#3f5235"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="36" cy="74" rx="6" ry="3" fill="#e7ab8b" />
      <ellipse cx="84" cy="74" rx="6" ry="3" fill="#e7ab8b" />
    </svg>
  );
}
