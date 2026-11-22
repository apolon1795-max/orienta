# Temporary shared Orienta pilot invitation

- Receive the common invite through the same access form as personal codes. The invite is **only** for enrolling, never for opening anybody's existing profile.
- The browser creates a private 128-bit ORI recovery code before enrolment. The learner securely saves it and confirms cloud storage. They do not type it at enrolment, and the same response starts a course-enabled session. Existing progress is not copied into the new profile implicitly.
- Generate an invitation using 8 cryptographically random bytes, encode as four groups of four uppercase hexadecimal characters following the `PILOT-` prefix. Only the owner/participants should receive the actual value. Never put it in a URL, code, browser bundle, deployment logs or file in the repository.
- Configure the public progress function with `ORIENTA_PILOT_INVITE_SHA256`: SHA-256 hex of the invite after converting to uppercase and removing spaces and hyphens. Retain existing course video/configuration env values. There is no DB migration or gateway change.
- Close enrolment by removing the hash in a new active function release (or rotate it for a different invite). Do not disable or delete learner records. Existing sessions and personal recovery codes remain valid.
- A durable 60-attempt/minute limit and distinct 60-account/day quota per trusted IP allow a 25-person class on shared Wi-Fi to enrol together without lifting the existing public free-registration policy. Invites are independent of the open free-registration flag.
- The shared invite is generally forwardable, not a membership list. Do not treat it as proof of identity or a payment receipt. Replacing it ends use of the original immediately after the configured active deployment is switched.
