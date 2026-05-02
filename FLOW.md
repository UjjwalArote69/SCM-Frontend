# SCM — Flow Diagrams

> Visual reference for how the Meka SCM system fits together.
> Diagrams use **Mermaid** — render in GitHub, Notion, or VS Code (with the Mermaid extension).

---

## Contents

1. [System Architecture](#1-system-architecture) — how the pieces talk to each other
2. [Procurement Pipeline](#2-procurement-pipeline) — PR → RFQ → PO → GRN end-to-end
3. [Award Approval Flow](#3-award-approval-flow) — three-party consensus + CFO/CEO chain
4. [PO Internal Approval Chain](#4-po-internal-approval-chain) — 5-stage gate before vendor can act
5. [Payment Approval Flow](#5-payment-approval-flow) — cost-tiered Finance / CFO / CEO chain
6. [Assignment System](#6-assignment-system) — Purchase HOD assigns RFQ / PO authoring
7. [Role-Based Access](#7-role-based-access) — who lands where, who can do what
8. [Auth & Request Lifecycle](#8-auth--request-lifecycle) — login, bearer flow, self-healing
9. [Data Model (ERD)](#9-data-model-erd) — core tables and relationships

---

## 1. System Architecture

```mermaid
flowchart LR
    classDef client fill:#dbeafe,stroke:#1e40af,stroke-width:2px,color:#1e3a8a
    classDef server fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef db fill:#dcfce7,stroke:#166534,stroke-width:2px,color:#14532d
    classDef edge stroke:#64748b,stroke-width:2px

    subgraph Client["🖥️&nbsp;&nbsp;React 19 + Vite 8"]
        direction TB
        Pages["📄&nbsp;Pages<br/><i>PR · RFQ · PO · GRN</i>"]
        Stores["🗃️&nbsp;Zustand stores<br/><i>per feature</i>"]
        Auth["🔐&nbsp;Auth store<br/><i>localStorage persist</i>"]
        ClientAPI["📡&nbsp;axios client<br/><i>auto-bearer · 127.0.0.1</i>"]
    end

    subgraph Server["⚙️&nbsp;&nbsp;Laravel API · :8000"]
        direction TB
        Mw["🛡️&nbsp;ApiToken MW<br/><i>throttle:5,1 on /login</i>"]
        Ctrl["🎯&nbsp;Controllers<br/><i>Pr · Rfq · Po · Grn · Vendor</i>"]
        Models["📦&nbsp;Eloquent Models<br/><i>AppPr · AppPo · AppRfq · AppGrn</i>"]
    end

    DB[("🗄️&nbsp;MySQL :3307<br/>meka_scm")]

    Pages --> Stores
    Stores --> ClientAPI
    Auth --> ClientAPI
    ClientAPI ==>|"Bearer token"| Mw
    Mw --> Ctrl
    Ctrl --> Models
    Models ==> DB

    class Pages,Stores,Auth,ClientAPI client
    class Mw,Ctrl,Models server
    class DB db
```

---

## 2. Procurement Pipeline

End-to-end procure-to-receive flow. **Any employee** can raise a PR (request a need). After CEO approval, the **Purchase HOD** allocates the post-approval work (RFQ + PO authoring) to a subordinate. **PO creation is locked to `purchase_officer` only** — only that role finalises the formal order. Every status mutation is guarded by a **terminal-state check** (409 if record is already in a terminal state).

```mermaid
flowchart TD
    classDef start fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,color:#312e81
    classDef approve fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef reject fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef action fill:#fef3c7,stroke:#a16207,stroke-width:2px,color:#713f12
    classDef hold fill:#e0f2fe,stroke:#0369a1,stroke-width:2px,color:#0c4a6e
    classDef vendor fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
    classDef purchase fill:#ffedd5,stroke:#c2410c,stroke-width:2px,color:#7c2d12
    classDef terminal fill:#d1fae5,stroke:#047857,stroke-width:3px,color:#064e3b

    Start(["👤&nbsp;<b>Any employee</b><br/>raises a need"]):::start
    PR["📋&nbsp;<b>PR Created</b><br/>by any authenticated user<br/>status: pending · chain_stage: hod"]:::action

    HOD{{"🧑‍💼&nbsp;HOD Review<br/><i>(department head)</i>"}}:::action
    CFO{{"💰&nbsp;CFO Review"}}:::action
    CEO{{"👑&nbsp;CEO Review"}}:::action
    Hold["⏸️&nbsp;<b>On Hold</b><br/><i>awaiting clarification</i>"]:::hold
    Cancelled(["🚫&nbsp;Cancelled<br/><i>by creator</i>"]):::reject
    Approved["✅&nbsp;<b>PR Approved</b><br/>chain_stage: done"]:::approve
    Rejected(["❌&nbsp;Rejected"]):::reject

    PurchaseHOD["🧑‍💼&nbsp;<b>Purchase Dept HOD</b><br/>reviews approved PR"]:::purchase
    Allocate["👥&nbsp;<b>Allocate work</b><br/>assigns to assistant /<br/>subordinate in dept"]:::purchase
    Assignee["🧑‍💻&nbsp;<b>Purchase Assistant</b><br/>handles RFQ → PO"]:::purchase

    RFQ["📨&nbsp;<b>RFQ Created</b><br/>by assignee · invites vendors"]:::action
    Submit["💬&nbsp;Vendors submit quotes<br/><i>identity from bearer token</i>"]:::vendor
    Compare["📊&nbsp;<b>Comparison</b><br/>status: compared"]:::action
    Award["🏆&nbsp;Award winner<br/>POST /rfqs/{n}/award"]:::approve

    PO["📦&nbsp;<b>PO Created</b><br/>🔒 by Purchase Officer ONLY<br/>after quote selection"]:::purchase
    POChain{{"🛡️&nbsp;5-stage internal<br/>approval chain"}}:::action
    VendorPO{{"Vendor Action"}}:::vendor
    PORej(["❌&nbsp;PO Rejected"]):::reject
    Accepted["✅&nbsp;<b>PO Accepted</b>"]:::approve

    Payment["💸&nbsp;<b>Payment</b><br/>cost-tiered chain<br/><i>Finance HOD ± CFO ± CEO</i>"]:::action

    GRN["📥&nbsp;<b>GRN</b><br/><i>warehouse roles</i>"]:::action
    Auto{{"received ≥ ordered?"}}:::action
    Partial["🔄&nbsp;Partial fulfillment<br/><i>more GRNs allowed</i>"]:::action
    Fulfilled(["🎉&nbsp;<b>PO auto-fulfilled</b>"]):::terminal

    Start --> PR --> HOD
    PR -.->|"creator cancels<br/>(while pending)"| Cancelled

    HOD -->|approve| CFO
    HOD -->|reject| Rejected
    HOD -->|hold| Hold
    CFO -->|approve| CEO
    CFO -->|reject| Rejected
    CFO -->|hold| Hold
    CEO -->|approve| Approved
    CEO -->|reject| Rejected
    CEO -->|hold| Hold

    Hold -.->|"resume<br/>back to current stage"| HOD
    Hold -.->|resume| CFO
    Hold -.->|resume| CEO

    Approved --> PurchaseHOD --> Allocate --> Assignee
    Assignee --> RFQ --> Submit --> Compare --> Award
    Award --> PO --> POChain
    POChain -->|"all 5 stages approve"| VendorPO
    POChain -->|reject at any stage| PORej
    VendorPO -->|reject| PORej
    VendorPO -->|accept| Accepted

    Accepted --> GRN --> Auto
    Accepted --> Payment
    Auto -->|no| Partial --> GRN
    Auto -->|yes| Fulfilled
```

> **Status update — 2026-04-30**: every stage in this pipeline is implemented.
> - Three-party consensus + CFO/CEO award chain: §3.
> - Purchase HOD assignment of RFQ/PO authoring: §6.
> - PO 5-stage internal approval chain (`POChain`): §4.
> - Cost-tiered payment chain after acceptance: §5.

> ### 🔒 Access rules for this pipeline
>
> - **PR create** → **any authenticated user** (employees raise needs from across the org).
> - **RFQ create / delete** → **`admin` + `purchase_officer` only** (item 6). HODs — including Purchase HOD — have approve+read only and *assign* authoring to a subordinate officer.
> - **PO create** → **`admin` + `purchase_officer` only** (item 6). The Purchase HOD assigns the authoring task once an RFQ is awarded.
> - **Quotation comparison leaderboard** → visible to **everyone** (transparency by design).
> - **Award button** → gated by the three-party consensus + CFO/CEO chain detailed in [§3](#3-award-approval-flow). Only the **Purchase HOD** ultimately fires the award.
> - **PO accept / reject** (vendor) → blocked until the **5-stage internal approval chain** ([§4](#4-po-internal-approval-chain)) reaches `done`.
> - **Payment** → cost-tiered chain ([§5](#5-payment-approval-flow)) determines whether the Finance HOD can release funds directly or needs CFO / CFO+CEO sign-off first.

---

## 3. Award Approval Flow

> **Status — implemented**. `agree()` / `withdrawAgreement()` + `cfoApprove`/`ceoApprove` + `award()` chain via `app_rfqs.chain_stage` machine (`open → compared → consensus → cfo → ceo → done`). See `RfqController` for the live implementation.

The "Award" action on a quotation is **not** a single click — it requires a three-party internal consensus, then the same CFO → CEO approval tree used for PRs. Two scenarios cover whether the Respective Department HOD agrees on the first round.

### 🔒 Vendor rate lock during consensus (item 7)

Once **any** HOD records their `agree` vote (any of the `respective` / `finance` / `purchase` slots populated), `submitQuote` returns **409** for every invited vendor — quotes are frozen so vendors can't pitch lower mid-evaluation. The lock releases only when *every* voting HOD withdraws (lock is OR across slots; partial withdrawals don't release).

For vendors, the API responds with `rates_locked: true/false` only — the underlying `consents` payload is **scrubbed server-side** so the vendor doesn't see who voted or which vendor each evaluator picked.

### Phase 1 — Three-party consensus (departmental)

Three stakeholders must converge on **one vendor** before the financial-approval tree opens:

| Party | Role | Why they review |
| --- | --- | --- |
| 🏢 Respective Dept HOD | Originating department head | Confirms vendor meets the technical / operational need that drove the PR |
| 💰 Finance Dept HOD | Finance head | Validates pricing, payment terms, financial fit |
| 🛒 Purchase Dept HOD | Purchase head | Confirms vendor compliance, history, procurement-policy fit |

```mermaid
flowchart TD
    classDef start fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,color:#312e81
    classDef party fill:#ffedd5,stroke:#c2410c,stroke-width:2px,color:#7c2d12
    classDef agree fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef disagree fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef comm fill:#e0f2fe,stroke:#0369a1,stroke-width:2px,color:#0c4a6e
    classDef gate fill:#fef3c7,stroke:#a16207,stroke-width:2px,color:#713f12
    classDef tree fill:#ede9fe,stroke:#6d28d9,stroke-width:2px,color:#4c1d95
    classDef final fill:#d1fae5,stroke:#047857,stroke-width:3px,color:#064e3b

    Compare(["📊&nbsp;Quotation Leaderboard<br/><i>visible to everyone</i>"]):::start

    RDeptHOD["🏢&nbsp;<b>Respective<br/>Dept HOD</b>"]:::party
    FinHOD["💰&nbsp;<b>Finance<br/>Dept HOD</b>"]:::party
    PurHOD["🛒&nbsp;<b>Purchase<br/>Dept HOD</b>"]:::party

    Decision{{"All three agree<br/>on the same vendor?"}}:::gate

    Case1["🟢&nbsp;<b>Case 1</b><br/>All three agree on first review"]:::agree
    Case2["🟡&nbsp;<b>Case 2</b><br/>Respective HOD disagrees<br/>(other two agree)"]:::disagree
    Comms["✉️&nbsp;<b>Internal communication</b><br/>email / chat / meeting<br/>negotiate until aligned"]:::comm
    Realign{{"Reach consensus<br/>on one vendor?"}}:::gate
    Stuck(["🛑&nbsp;Award blocked<br/>until consensus"]):::disagree

    Phase2["🚀&nbsp;<b>Consensus reached</b><br/>unlock financial tree → Phase 2"]:::final

    Compare --> RDeptHOD
    Compare --> FinHOD
    Compare --> PurHOD

    RDeptHOD --> Decision
    FinHOD --> Decision
    PurHOD --> Decision

    Decision -->|yes — first round| Case1 --> Phase2
    Decision -->|no| Case2 --> Comms --> Realign
    Realign -->|yes| Phase2
    Realign -->|no| Stuck
    Stuck -.->|retry| Comms
```

### Phase 2 — Financial approval tree + final award

Once the three departmental HODs agree on a vendor, the decision flows up the same approval tree used for PRs. The **Award button** only becomes functional on the Purchase HOD's screen after CEO approval.

```mermaid
flowchart LR
    classDef start fill:#d1fae5,stroke:#047857,stroke-width:2px,color:#064e3b
    classDef tree fill:#ede9fe,stroke:#6d28d9,stroke-width:2px,color:#4c1d95
    classDef gate fill:#fef3c7,stroke:#a16207,stroke-width:2px,color:#713f12
    classDef hold fill:#e0f2fe,stroke:#0369a1,stroke-width:2px,color:#0c4a6e
    classDef reject fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef approve fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef final fill:#fde68a,stroke:#b45309,stroke-width:3px,color:#78350f

    Consensus(["🚀&nbsp;Three-party<br/>consensus reached"]):::start

    CFO{{"💰&nbsp;CFO Review"}}:::tree
    CEO{{"👑&nbsp;CEO Review"}}:::tree
    CFOHold["⏸️&nbsp;Hold / Reject<br/><i>back to consensus</i>"]:::hold
    CEOHold["⏸️&nbsp;Hold / Reject<br/><i>back to consensus</i>"]:::hold

    Unlock["🔓&nbsp;<b>Award button unlocked</b><br/>on Purchase HOD screen<br/><i>only Purchase HOD can fire it</i>"]:::approve
    Awarded["🏆&nbsp;<b>Vendor Awarded</b><br/>POST /rfqs/{n}/award<br/>RFQ status: awarded"]:::final
    POFlow(["📦&nbsp;Continue to PO creation<br/>(Purchase Dept)"]):::start

    Consensus --> CFO
    CFO -->|approve| CEO
    CFO -->|reject / hold| CFOHold
    CEO -->|approve| Unlock
    CEO -->|reject / hold| CEOHold
    CFOHold -.->|re-review| Consensus
    CEOHold -.->|re-review| Consensus

    Unlock -->|"Purchase HOD<br/>clicks Award"| Awarded --> POFlow
```

> ### 🛡️ Award button visibility matrix
>
> | Stage | Award button visible? | Functional? | Who can fire? |
> | --- | --- | --- | --- |
> | Three-party consensus pending | ❌ Hidden | — | — |
> | Consensus reached, awaiting CFO | ❌ Hidden | — | — |
> | CFO approved, awaiting CEO | ❌ Hidden | — | — |
> | **CEO approved** | ✅ Visible | ✅ Yes | **Purchase HOD only** |
> | Awarded (terminal) | — | — | — |

---

## 4. PO Internal Approval Chain

> **Status — implemented (2026-04-30)**. `app_pos.chain_stage` + `PoController::updateStatus()`.

Once a `purchase_officer` drafts a PO, it doesn't go straight to the vendor — it passes through a **5-stage internal approval chain**. Each stage is gated to the matching role; admin overrides every stage. Reject at any stage closes the PO as `rejected`. Hold parks at the current stage until reviewed.

`respective_hod` is **skipped** automatically when `respective_dept_code` is null (ad-hoc PO with no PR ancestry).

```mermaid
flowchart LR
    classDef start fill:#ffedd5,stroke:#c2410c,stroke-width:2px,color:#7c2d12
    classDef stage fill:#fef3c7,stroke:#a16207,stroke-width:2px,color:#713f12
    classDef tree fill:#ede9fe,stroke:#6d28d9,stroke-width:2px,color:#4c1d95
    classDef done fill:#d1fae5,stroke:#047857,stroke-width:3px,color:#064e3b
    classDef vendor fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
    classDef reject fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d

    PO(["📦&nbsp;PO drafted by<br/>purchase_officer"]):::start
    PHOD{{"🧑‍💼&nbsp;<b>Purchase HOD</b>"}}:::stage
    FHOD{{"💰&nbsp;<b>Finance HOD</b>"}}:::stage
    RHOD{{"🏢&nbsp;<b>Respective Dept HOD</b><br/><i>skipped if no PR</i>"}}:::stage
    CFO{{"💼&nbsp;<b>CFO</b>"}}:::tree
    CEO{{"👑&nbsp;<b>CEO</b>"}}:::tree
    Done(["🔓&nbsp;<b>chain_stage = done</b><br/>vendor unlocked"]):::done
    Vendor{{"Vendor accept / reject"}}:::vendor
    Rej(["❌&nbsp;Rejected at any stage"]):::reject

    PO --> PHOD
    PHOD -->|approve| FHOD
    FHOD -->|approve| RHOD
    RHOD -->|approve| CFO
    FHOD -.->|"no respective_dept_code"| CFO
    CFO -->|approve| CEO
    CEO -->|approve| Done --> Vendor

    PHOD -.->|reject| Rej
    FHOD -.->|reject| Rej
    RHOD -.->|reject| Rej
    CFO -.->|reject| Rej
    CEO -.->|reject| Rej
```

> **Vendor visibility**: while the chain is live, vendor responses see only `released: false` (a boolean derived from `chain_stage='done'`). The fields `chain_stage`, `respective_dept_code`, `approval_history`, `last_comment` are stripped server-side via `PoController::scrubForVendor()`.

---

## 5. Payment Approval Flow

> **Status — implemented (2026-04-30)**. `app_payments.chain_stage` + `PaymentController::updateStatus()` / `markPaid()`. Items 10 + 11 of FLOW.

Once a PO is `accepted` (or `fulfilled`), Finance can issue a payment. The approval depth depends on the **amount**:

| Amount | Chain | Approvers required |
| --- | --- | --- |
| **< ₹50,000** | `cleared_to_pay` from create | Finance HOD releases directly |
| **₹50,000 – < ₹5,00,000** | `pending_cfo → cleared_to_pay` | CFO approve → Finance HOD releases |
| **≥ ₹5,00,000** | `pending_cfo → pending_ceo → cleared_to_pay` | CFO → CEO → Finance HOD releases |

```mermaid
flowchart TD
    classDef start fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef finance fill:#ede9fe,stroke:#6d28d9,stroke-width:2px,color:#4c1d95
    classDef tier fill:#fef3c7,stroke:#a16207,stroke-width:2px,color:#713f12
    classDef cleared fill:#d1fae5,stroke:#047857,stroke-width:2px,color:#064e3b
    classDef paid fill:#fde68a,stroke:#b45309,stroke-width:3px,color:#78350f
    classDef reject fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d

    Trigger(["📦&nbsp;PO accepted /<br/>fulfilled"]):::start
    Create["💸&nbsp;<b>Payment created</b><br/><i>by Finance HOD /<br/>Accountant / Admin</i>"]:::finance
    TierGate{{"Amount tier?"}}:::tier
    T1["✅&nbsp;Tier 1 — < ₹50k"]:::tier
    T2["💼&nbsp;Tier 2 — ₹50k–5L"]:::tier
    T3["👑&nbsp;Tier 3 — ≥ ₹5L"]:::tier
    CFO{{"💼&nbsp;CFO approves"}}:::tier
    CEO{{"👑&nbsp;CEO approves"}}:::tier
    Cleared["🔓&nbsp;<b>cleared_to_pay</b>"]:::cleared
    Pay["🧑‍💼&nbsp;Finance HOD<br/>marks paid"]:::finance
    Paid(["💵&nbsp;<b>status = paid</b><br/>paid_at recorded"]):::paid
    Rej(["❌&nbsp;Rejected"]):::reject

    Trigger --> Create --> TierGate
    TierGate -->|< 50k| T1 --> Cleared
    TierGate -->|50k – 5L| T2 --> CFO
    TierGate -->|≥ 5L| T3 --> CFO
    CFO -->|tier 2 approve| Cleared
    CFO -->|tier 3 approve| CEO
    CEO -->|approve| Cleared
    Cleared --> Pay --> Paid

    CFO -.->|reject| Rej
    CEO -.->|reject| Rej
```

> ### Visibility
>
> - **List** is open to every in-org role (transparency by design — same as the RFQ leaderboard). Vendors see only their own payments, scoped by `vendor_name`.
> - **Create** is restricted to Finance HOD / Accountant / Admin.
> - **Mark paid** is restricted to Finance HOD / Admin AND requires `chain_stage='cleared_to_pay'`.

---

## 6. Assignment System

> **Status — implemented (2026-04-30)**. New columns + endpoints, item 6.

Per the role policy, **HODs (incl. Purchase HOD) cannot author RFQs or POs directly** — they have approve+read access only. Authoring belongs to a `purchase_officer` subordinate. The Purchase HOD picks one and hands them the work.

```mermaid
flowchart LR
    classDef start fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef hod fill:#ffedd5,stroke:#c2410c,stroke-width:2px,color:#7c2d12
    classDef officer fill:#dbeafe,stroke:#1e40af,stroke-width:2px,color:#1e3a8a
    classDef doc fill:#fef3c7,stroke:#a16207,stroke-width:2px,color:#713f12

    PRApproved(["✅&nbsp;PR fully approved<br/>by HOD/CFO/CEO"]):::start
    PHOD1["🛒&nbsp;<b>Purchase HOD</b>"]:::hod
    AssignRfq["👥&nbsp;Assign RFQ author<br/>POST /prs/{n}/assign-rfq-author<br/>writes pr.assigned_rfq_author_id"]:::hod
    Officer1["🧑‍💻&nbsp;<b>purchase_officer</b><br/><i>sees PR in 'assigned to me'</i>"]:::officer
    RFQDraft["📨&nbsp;Drafts RFQ"]:::doc

    Awarded(["🏆&nbsp;RFQ awarded"]):::start
    PHOD2["🛒&nbsp;<b>Purchase HOD</b>"]:::hod
    AssignPo["👥&nbsp;Assign PO author<br/>POST /rfqs/{n}/assign-po-author<br/>writes rfq.assigned_po_author_id"]:::hod
    Officer2["🧑‍💻&nbsp;<b>purchase_officer</b>"]:::officer
    PODraft["📦&nbsp;Drafts PO"]:::doc

    PRApproved --> PHOD1 --> AssignRfq --> Officer1 --> RFQDraft
    Awarded --> PHOD2 --> AssignPo --> Officer2 --> PODraft
```

> **Storage**: two nullable FK columns — `app_prs.assigned_rfq_author_id` and `app_rfqs.assigned_po_author_id` — both reference `users.id` with `nullOnDelete`.
>
> **Officer's queue**: `GET /prs?assigned_to_me=1` and `GET /rfqs?assigned_to_me=1` return only the documents handed to the calling user. `PrController::index()` also widens the default scope so an assigned officer sees PRs they didn't create.
>
> **Picker endpoint**: `GET /users/purchase-officers` returns the list of `purchase_officer` users. Restricted to PURCH HOD + admin.

---

## 7. Role-Based Access

Three audiences, three layouts, eleven roles. RBAC is enforced **defense-in-depth** — `<RoleGate>` on the route, axios bearer in transit, `ApiToken` middleware at the edge, controller `BACKOFFICE_ROLES` / `WAREHOUSE_ROLES` constants at the action.

```mermaid
flowchart LR
    classDef entry fill:#ede9fe,stroke:#6d28d9,stroke-width:2px,color:#4c1d95
    classDef admin fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef user fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    classDef vendor fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
    classDef forbidden fill:#fef3c7,stroke:#a16207,stroke-width:2px,color:#713f12

    Login(["🔑&nbsp;/login"]):::entry
    Boot["⚡&nbsp;AuthBootstrap<br/>GET /api/me"]:::entry
    Gate{{"RoleGate"}}:::entry

    Admin["🛠️&nbsp;<b>/admin</b><br/>AdminLayout"]:::admin
    AdminCaps["• Full CRUD: PR · RFQ · PO · GRN<br/>• Manage Users · Vendors · Items<br/>• Approve / suspend vendors<br/>• Override any status"]:::admin

    User["👤&nbsp;<b>/app</b><br/>UserLayout"]:::user
    UserCaps["• Create PR (any role)<br/>• Approve at matching chain_stage<br/>• Create RFQ/PO if BACKOFFICE_ROLE<br/>• Create GRN if WAREHOUSE_ROLE<br/>• View list scoped to creator"]:::user

    Vendor["🏢&nbsp;<b>/vendor</b><br/>VendorLayout"]:::vendor
    VendorCaps["• See only invited RFQs<br/>• Submit quotes (identity ← token)<br/>• Accept / reject own POs<br/>• Self-update via PUT /me"]:::vendor

    F403["🚫&nbsp;/403"]:::forbidden

    Login --> Boot --> Gate
    Gate -->|admin| Admin --> AdminCaps
    Gate -->|"employee · manager · hod<br/>cfo · ceo · purchase_officer<br/>accountant · director · customer"| User --> UserCaps
    Gate -->|vendor| Vendor --> VendorCaps
    Gate -->|unknown / tampered| F403
```

---

## 8. Auth & Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 User
    participant R as ⚛️ React
    participant LS as 💾 localStorage
    participant API as 🔧 Laravel
    participant DB as 🗄️ MySQL

    rect rgb(219, 234, 254)
        Note over U,DB: Login
        U->>R: email + password
        R->>API: POST /api/login<br/>(throttle:5,1)
        API->>DB: verify + store sha256(token)<br/>→ users.api_token
        API-->>R: { user, token }
        R->>LS: persist scm-auth
        R-->>U: redirect by role
    end

    rect rgb(254, 243, 199)
        Note over R,DB: Authenticated request
        R->>API: GET /api/prs<br/>Authorization: Bearer ‹token›
        API->>API: ApiToken middleware<br/>verify sha256 hash
        API->>API: Controller RBAC<br/>(BACKOFFICE_ROLES etc.)
        API->>DB: scoped query<br/>(creator / vendor / all)
        API-->>R: data[]
    end

    rect rgb(220, 252, 231)
        Note over R,API: Self-heal on app mount
        R->>API: GET /api/me
        API-->>R: fresh role
        Note right of R: Tampered localStorage<br/>roles get overwritten
    end
```

---

## 9. Data Model (ERD)

Core tables. All item lists, vendor invites, and quote responses are stored as **JSON columns** on the parent record — denormalised by design for snapshot integrity.

```mermaid
erDiagram
    USERS ||--o| APP_VENDORS : "linked via user_id"
    USERS ||--o{ APP_PRS : creates
    USERS {
        bigint id PK
        string name
        string email UK
        string role
        string api_token "sha256"
    }
    APP_VENDORS {
        bigint id PK
        bigint user_id FK
        string vendor_code UK
        string vendor_name
        string status "approved/pending/suspended"
        json bank_details
        string gst
        string pan
    }
    APP_PRS ||--o{ APP_RFQS : "spawns"
    APP_PRS {
        string number PK "PR-YYYY-NNNN"
        string status
        string chain_stage "hod/cfo/ceo/done"
        json items
        json approval_history "audit trail"
        bigint creator_id FK
        bigint assigned_rfq_author_id FK "Purchase HOD assigns"
    }
    APP_RFQS ||--o{ APP_POS : "awarded → creates"
    APP_RFQS {
        string number PK "QT-YYYY-NNNN"
        string status "open/compared/awarded/closed"
        string chain_stage "open/compared/consensus/cfo/ceo/done"
        string pr_number FK
        json items
        json vendors "invited names"
        json responses "vendor quotes"
        json consents "3-party votes + history"
        string awarded_vendor
        bigint assigned_po_author_id FK "Purchase HOD assigns"
    }
    APP_POS ||--o{ APP_GRNS : "received via"
    APP_POS ||--o{ APP_PAYMENTS : "settled by"
    APP_POS {
        string number PK "PO-YYYY-NNNN"
        string status "pending/accepted/fulfilled/rejected"
        string chain_stage "purchase_hod/finance_hod/respective_hod/cfo/ceo/done"
        string respective_dept_code "from source PR"
        string rfq_number FK
        string vendor "name snapshot"
        json items "with rate + gst"
        json approval_history "audit trail"
    }
    APP_GRNS {
        string number PK "GRN-YYYY-NNN"
        string po_number FK
        string status "partial/full"
        string vendor
        json items "received qty"
    }
    APP_PAYMENTS {
        string number PK "PAY-YYYY-NNNN"
        string po_number FK
        string vendor "name snapshot"
        decimal amount "₹"
        string status "pending/paid/rejected"
        string chain_stage "pending_cfo/pending_ceo/cleared_to_pay/done"
        string payment_method
        string reference_no "UTR/cheque/txn id"
        timestamp paid_at
        json approval_history
        bigint created_by FK
    }
```

---

## Appendix · Auto-generated number formats

| Document | Pattern         | Example          |
| -------- | --------------- | ---------------- |
| PR       | `PR-YYYY-NNNN`  | `PR-2026-0042`   |
| RFQ      | `QT-YYYY-NNNN`  | `QT-2026-0017`   |
| PO       | `PO-YYYY-NNNN`  | `PO-2026-0009`   |
| GRN      | `GRN-YYYY-NNN`  | `GRN-2026-031`   |
| Payment  | `PAY-YYYY-NNNN` | `PAY-2026-5001`  |

## Appendix · Terminal states (mutation blocked, returns 409)

| Entity  | Terminal states                          |
| ------- | ---------------------------------------- |
| PR      | `approved` · `rejected` · `cancelled` <br/>(`hold` is **non-terminal** — resumable) |
| RFQ     | `awarded` · `closed`                     |
| PO      | `fulfilled` · `rejected` (`accepted` ≠ terminal — GRN flow continues) |
| GRN     | _(no terminal — append-only)_            |
| Payment | `paid` · `rejected`                      |

## Appendix · Chain stages by entity

| Entity  | `chain_stage` values |
| ------- | -------------------- |
| PR      | `hod` → `cfo` → `ceo` → `done` |
| RFQ     | `open` → `compared` → `consensus` → `cfo` → `ceo` → `done` |
| PO      | `purchase_hod` → `finance_hod` → `respective_hod` → `cfo` → `ceo` → `done` (`respective_hod` skipped if no PR ancestry) |
| Payment | `cleared_to_pay` (Tier 1) <br/>or `pending_cfo` → `cleared_to_pay` (Tier 2) <br/>or `pending_cfo` → `pending_ceo` → `cleared_to_pay` (Tier 3) <br/>then `done` after `markPaid` |
