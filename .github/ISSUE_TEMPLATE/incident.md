// .github/ISSUE_TEMPLATE/incident.md
name: Incident Report
description: Report a production incident
title: "[INCIDENT] "
labels: ["incident", "urgent"]
body:
  - type: textarea
    id: description
    attributes:
      label: Incident Description
      description: What happened?
      placeholder: "Brief summary of the incident"
    validations:
      required: true

  - type: textarea
    id: impact
    attributes:
      label: Impact
      description: Who is affected and how?
      placeholder: "e.g., 10% of users experiencing slow login"
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - P1 - Critical (> 5% users affected)
        - P2 - High (1-5% users affected)
        - P3 - Medium (minor feature broken)
        - P4 - Low (cosmetic)
    validations:
      required: true

  - type: textarea
    id: root_cause
    attributes:
      label: Root Cause (if known)
      description: What caused the issue?

  - type: textarea
    id: steps_to_resolve
    attributes:
      label: Steps to Resolve
      description: What actions were taken?

  - type: input
    id: resolved_at
    attributes:
      label: Resolved At (ISO timestamp)
      placeholder: "2026-04-15T14:30:00Z"
