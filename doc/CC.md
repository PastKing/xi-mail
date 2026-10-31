# Cc support

The compose window accepts an optional Cc list. It uses the same batch paste
syntax as To and stores each address as `{address, name}` JSON in `email.cc`.
To addresses take precedence when the same address appears in both lists.

The send API validates both arrays, deduplicates them, applies role and quota
checks to the combined recipient count, and passes Cc to either Resend or the
Cloudflare Email Sending binding. Internal Cc recipients are delivered through
the existing on-site delivery path.
