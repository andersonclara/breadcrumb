import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import {
  crumbRecord,
  discoveryKey,
  discoveryTime,
  isCurrentRecord,
  mappable,
  isDemoRecord,
  type DiscoveryRecord,
} from "@breadcrumb/shared";
import { useExplore } from "@/providers/explore-provider";
import { useCampus } from "@/providers/world-provider";
import { apiFetch } from "@/lib/api";
import { GameButton, Feedback, useGameStyles } from "./game-ui";
export function DiscoveryDetail({
  record: input,
  onClose,
}: {
  record: DiscoveryRecord;
  onClose: () => void;
}) {
  const s = useGameStyles();
  const { world, act, isPending, refresh } = useCampus(),
    e = useExplore();
  const [checking, setChecking] = useState(true),
    [verified, setVerified] = useState(false),
    [fresh, setFresh] = useState<DiscoveryRecord | null>(null),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [reporting, setReporting] = useState(false),
    [reason, setReason] = useState(""),
    [retry, setRetry] = useState(0);
  const crumb = world.crumbs.find((c) => c.id === input.id),
    r = input.kind === "crumb" && crumb ? crumbRecord(crumb) : (fresh ?? input);
  const available =
    !checking &&
    verified &&
    isCurrentRecord(r) &&
    (isDemoRecord(r) ? !!e.demo && e.demoRecords.some(item => item.id === r.id) : !(r.kind === "crumb" && world.profile && !crumb));
  const pending = isPending("vote", r.id) || isPending("report", r.id);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    async function check() {
      try {
        if (isDemoRecord(input)) {
          const current = e.demoRecords.find(item => item.id === input.id);
          if (active) { setFresh(current ?? null); setVerified(!!current && isCurrentRecord(current)); }
          return;
        }
        if (input.kind === "crumb" && crumb) {
          const next = await refresh();
          if (!next)
            throw new Error(
              "Could not check current campus reports. Please retry.",
            );
          if (active) {
            const current = next.crumbs.find((c) => c.id === input.id);
            setFresh(current ? crumbRecord(current) : null);
            setVerified(!!current && isCurrentRecord(crumbRecord(current)));
          }
          return;
        }
        const response = await apiFetch(
          ("/api/discover?kind=" +
            input.kind +
            "&id=" +
            input.id) as `/api/${string}`,
          { signal: abort.signal },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Could not check this discovery.");
        if (active) {
          const current = result.records.find(
            (x: DiscoveryRecord) => discoveryKey(x) === discoveryKey(input),
          );
          setFresh(current ?? null);
          setVerified(!!current && isCurrentRecord(current));
        }
      } catch (err) {
        if (active && !abort.signal.aborted)
          setFailure(
            err instanceof Error
              ? err.message
              : "Could not check this discovery.",
          );
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => {
      active = false;
      abort.abort();
    };
    // Recheck selection and explicit retries; polling supplies current Crumb facts without restarting requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.kind, input.id, retry]);
  async function vote(value: 1 | -1) {
    try {
      setFailure("");
      await act("vote", { id: r.id, value });
      setMessage(
        value === 1
          ? "Thanks — your confirmation helps everyone."
          : "Thanks — your update was recorded.",
      );
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : "Could not update this Crumb.",
      );
    }
  }
  async function report() {
    try {
      setFailure("");
      await act("report", { id: r.id, reason });
      onClose();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Could not send report.");
    }
  }
  async function openUrl(url: string) {
    try {
      const p = new URL(url);
      if (!["http:", "https:"].includes(p.protocol)) return;
      await Linking.openURL(p.href);
    } catch {
      setFailure("Could not open this link. Please retry.");
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.muted}>
        {isDemoRecord(r) ? "DEMO · SIMULATED REPORT" : r.kind === "crumb" ? "CAMPUS REPORT" : "SCHEDULED EVENT"}
      </Text>
      <Text style={s.title}>{r.title}</Text>
      <Text style={s.body}>{r.venue ?? "Venue not listed"}</Text>
      <Text style={s.label}>{discoveryTime(r)}</Text>
      {r.description && r.description !== r.title ? (
        <Text style={s.body}>{r.description}</Text>
      ) : null}
      {r.kind === "crumb" ? (
        <>
          <Text style={s.body}>
            {isDemoRecord(r) ? `${r.confirmCount} simulated confirmations` : r.confirmCount > 0
              ? "Confirmed by " +
                r.confirmCount +
                " student" +
                (r.confirmCount === 1 ? "" : "s")
              : "Unconfirmed community report"}
          </Text>
          {r.expiresAt && (
            <Text style={s.muted}>
              Expires{" "}
              {new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/New_York",
              }).format(new Date(r.expiresAt))}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={s.muted}>Source: {r.source}</Text>
          <Text style={s.body}>{r.priceText ?? "Price not listed"}</Text>
        </>
      )}
      {checking ? (
        <Feedback message="Checking the latest details…" />
      ) : !available && !failure ? (
        <Feedback
          error
          message="This discovery has expired, been removed, or is no longer available."
        />
      ) : null}
      <Feedback error message={failure} />
      {failure && (
        <GameButton
          variant="secondary"
          onPress={() => {
            setChecking(true);
            setVerified(false);
            setFailure("");
            setRetry((n) => n + 1);
          }}
        >
          Retry latest details
        </GameButton>
      )}
      <Feedback message={message} />
      {available && r.sourceUrl && (
        <GameButton onPress={() => void openUrl(r.sourceUrl!)}>
          Open event source
        </GameButton>
      )}
      {available && mappable(r) && (
        <GameButton
          variant="secondary"
          onPress={() =>
            void openUrl(
              "https://www.google.com/maps/search/?api=1&query=" +
                encodeURIComponent(r.latitude + "," + r.longitude),
            )
          }
        >
          Open directions
        </GameButton>
      )}
      <GameButton
        disabled={isDemoRecord(r) || !e.savedReady || !e.savedWritable}
        variant="secondary"
        onPress={() => e.toggleSaved(r)}
      >
        {isDemoRecord(r) ? 'Demo reports are temporary' : e.saved.some((x) => discoveryKey(x) === discoveryKey(r))
          ? "Remove from saved"
          : "Save discovery"}
      </GameButton>
      <Feedback error message={e.savedError} />
      {r.kind === "crumb" &&
        !isDemoRecord(r) &&
        available &&
        (world.profile ? (
          <>
            {crumb?.is_author ? (
              <Text style={s.muted}>
                You posted this Crumb. Other students can confirm it.
              </Text>
            ) : (
              <>
                <GameButton
                  loading={isPending("vote", r.id)}
                  disabled={pending}
                  onPress={() => void vote(1)}
                >
                  {crumb?.my_vote === 1 ? "Confirmed by you" : "I see this now"}
                </GameButton>
                <GameButton
                  disabled={pending}
                  variant="secondary"
                  onPress={() => void vote(-1)}
                >
                  This has ended / dispute
                </GameButton>
              </>
            )}
            <GameButton
              variant="secondary"
              onPress={() => setReporting(!reporting)}
            >
              {reporting ? "Cancel report" : "Report this Crumb"}
            </GameButton>
            {reporting && (
              <View style={s.card}>
                <Text style={s.label}>Why are you reporting this?</Text>
                {["harassment", "privacy", "spam", "other"].map((v) => (
                  <GameButton
                    key={v}
                    variant={reason === v ? "primary" : "secondary"}
                    onPress={() => setReason(v)}
                  >
                    {reason === v ? "✓ " : ""}
                    {v[0].toUpperCase() + v.slice(1)}
                  </GameButton>
                ))}
                <GameButton
                  variant="danger"
                  disabled={!reason || pending}
                  loading={isPending("report", r.id)}
                  onPress={() => void report()}
                >
                  Submit report and hide
                </GameButton>
              </View>
            )}
          </>
        ) : (
          <GameButton
            onPress={() => {
              onClose();
              router.push("/login");
            }}
          >
            Sign in to confirm
          </GameButton>
        ))}
    </View>
  );
}
