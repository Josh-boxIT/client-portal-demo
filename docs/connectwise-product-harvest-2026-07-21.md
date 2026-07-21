# ConnectWise Maintenance Contract product harvest

Generated from the live ConnectWise PSA API on **July 21, 2026 at 11:17 AM ET**.

## Scope and method

This is a read-only inventory intended for reviewing what should appear in **Admin → Products**. No portal catalog or ConnectWise records were changed.

- Companies: status **Active**, not deleted, and carrying either the **Client** or **Special Info** company type.
- Agreements: parent agreement type **Maintenance Contract**, agreement status **Active**, not cancelled, already started, and either not ended or marked with no ending date.
- Additions: parent agreement passed the checks above; addition status is active when present, its effective date has arrived, and it has no current/past cancellation date.
- Product data: every referenced addition product was resolved through the ConnectWise procurement catalog endpoint.
- Deduplication: case-insensitive ConnectWise catalog **description** (the human-readable product name), falling back to the addition product identifier when a catalog description is unavailable.

## Harvest totals

| Measure | Count |
|---|---:|
| Companies returned by the API | 1,966 |
| Eligible active Client / Special Info companies | 177 |
| Maintenance Contract agreements returned after API filtering | 154 |
| Eligible active parent agreements | 147 |
| Active agreement additions | 950 |
| Referenced ConnectWise catalog IDs | 102 |
| Unique product names after deduplication | 99 |
| Catalog lookup failures | 0 |
| ConnectWise API requests | 252 |
| Rate-limit retries | 0 |

## Curation observations

- **26 products** appear at 10 or more companies, **31** appear at 2–9 companies, and **42** occur at only one company. The long tail deserves manual review before becoming a globally offered product.
- Three names combine multiple catalog IDs: **Open DNS Protection**, **Mid-tier plan**, and **Mid-tier server plan**. Their identifiers remain visible in the inventory below.
- The list includes things that may be billed additions without being sales-opportunity offerings: dormant-device charges, SPLA licensing, hardware/telephony, recurring labor blocks, and customer-specific package variants.
- ConnectWise catalog prices are standard values, while observed agreement unit prices include client-specific and historical pricing. Zero-dollar and unusually broad ranges should be curated rather than copied mechanically.
- ConnectWise units map cleanly only in some cases: **User** suggests the portal's per-user model and **Device** suggests per-device. **Each**, **Month**, **Hour**, and **Flat Fee** need a product-by-product pricing-model decision.

## Curated shortlist: obvious add-ons and products

This shortlist reduces the 99 harvested names to **25 customer-facing offerings** that are plausibly useful to the Sales Opportunities agent. Closely related catalog entries are consolidated under a customer-friendly name. Counts are source addition counts, not necessarily distinct customers when multiple source SKUs are combined.

The package families use generalized names and matching aliases instead of exposing platform, nonprofit, pricing, or customer-specific variants. Standard and premium support remain separate because the premium tier materially adds T3 support, quarterly business/security assessment, and the NIST security add-on.

| Proposed admin product | ConnectWise source product(s) | Suggested category | Draft pricing model | Observed active pricing | Active additions |
|---|---|---|---|---:|---:|
| Core Package | All PC, Mac, per-user, BYOD, nonprofit, iPad, and customer-specific Core Package variants | Managed Services | Per device or per user | $8.745–$91 on paid rows | 175 |
| Unlimited Support Package | Standard PC, Mac, and nonprofit Unlimited Support variants | Managed Services | Per device | $27.20–$107.50/device | 37 |
| Premium Unlimited Support Package | Premium PC and Mac Unlimited Support variants | Managed Services | Per device | $146/device | 2 |
| Security Awareness Training | Security Awareness & Training Package via KnowBe4 | Security | Per user | $2.50–$19/user | 60 |
| Identity Threat Detection & Response | ITDR a la carte | Security | Per user | $4–$12.50/user | 30 |
| Advanced Email Security | Enterprise Email Protection; Reflexion Spam Filter | Security | Per user | $3–$7.42/user | 25 |
| DNS Protection | Open DNS Protection | Security | Per user, with network-priced variant | $3.25/user; network variant up to $68 | 15 |
| Breach Monitoring | HIBP 50-or-less and 51-or-more tiers | Security | Flat monthly tier | $50–$106/month | 21 |
| Multi-Factor Authentication | Duo 2FA | Security | Per user | $3.30–$3.50/user | 5 |
| Managed Antivirus | Managed Antivirus a la carte | Security | Per device | $3–$7/device | 14 |
| Managed SIEM | Huntress Security Information and Event Management | Security | Flat monthly; confirm scope | $200 observed | 1 |
| Vulnerability Management | ConnectSecure | Security | Per user | $4.25 observed; $5.50 catalog | 1 |
| Vulnerability Assessment | Security - Vulnerability Scan | Security | Flat monthly | $53 observed; $212 catalog | 1 |
| Enterprise Password Manager | Security policy via BitWarden | Security | Per user | $6.50–$7/user | 1 |
| Secure Remote Access / VPN | Remote VPN via Twingate | Security | Per user | $6.50/user | 1 |
| Microsoft 365 Cloud Backup | Spanning O365 Cloud Backup | Backup | Per user | $3–$7/user | 46 |
| Google Workspace Cloud Backup | Spanning Google Cloud Backup | Backup | Per user | $1.95–$6/user | 23 |
| Salesforce Cloud Backup | Spanning Salesforce | Backup | Per user | $4.25/user | 2 |
| Workstation Cloud Backup | Ninja Data Protection workstation backup | Backup | Per device | $8.50–$27/device | 27 |
| Managed Server Backup / BCDR | Unitrends; NinjaOne; generic managed-server backup SKUs | Backup | Per device or flat appliance | $31.80–$618 | 25 |
| Network Monitoring | Network Monitoring | Infrastructure | Flat monthly per network/site | Up to $618; some $0 rows | 39 |
| ISP Monitoring | ISP Monitoring | Infrastructure | Flat monthly per site | $84.50–$211.50 | 10 |
| Managed Firewall | Fully Managed Cisco Firewall | Infrastructure | Per device or flat monthly | $68–$204 | 4 |
| Private Cloud Hosting | Private Cloud Hosting; Private Cloud Instance | Hosting | Flat monthly | $145.75–$442 on paid rows | 10 |
| PCI DSS Compliance Service | PCIDSS Service with SAQ A | Compliance | Flat monthly | $920 observed; $975 catalog | 1 |

### Explicitly excluded

- Dormant Windows/macOS device charges and available-inventory licensing/storage.
- Standalone T3/time-entry, block-time, recurring labor, phone-support, generic maintenance, minimum-contract, and billing-adjustment rows. Packaged support tiers remain included above.
- Individual PC/Mac, nonprofit, per-user, and customer-specific Core/Unlimited Support variants. These are represented by the three generalized package families above rather than separate admin products. Managed-server base packages remain excluded.
- Hardware/HaaS rows such as access points, switches, routers, computers, phones, and servers.
- Telephony lines, DIDs, SIP trunks, toll-free numbers, taxes, and fees.
- Microsoft and SPLA pass-through licenses.
- Internal or delivery tooling such as LogMeIn, Streamline IT, and BG/CloudRadial access.
- Generic placeholders such as Miscellaneous, Network Service, Backup Solution, and Phone Support Fee.

### Held for manual review

These may be real offerings but are not obvious enough to place in the global opportunity catalog without a product-owner decision: **Security+ / Security++ packages**, **Sophos Extended Support**, **Google Workspace Mobile Device Management**, **Hosted Cold Storage**, and **Shared Webhosting**.

## Category summary

| ConnectWise category | Unique names |
|---|---:|
| Managed Services | 85 |
| Software | 5 |
| Microsoft | 4 |
| Services Agreement | 3 |
| Hardware | 2 |

## Full product inventory

The catalog price and category come from ConnectWise Products. Observed unit-price ranges come from the active agreement additions in scope.

### Broadly deployed (10+ companies)

| # | Product name | ConnectWise identifier(s) | Category / subcategory | UOM | Catalog price | Observed unit price | Companies | Agreements | Additions |
|---:|---|---|---|---|---:|---:|---:|---:|---:|
| 1 | PC Core Package | Core Package - PC | Managed Services / Managed IT Services | Device | $40 | $8.745–$91 | 82 | 82 | 82 |
| 2 | Dormant Windows Device | Dormant Windows Device | Managed Services / Managed IT Services | Device | $3 | $0–$3 | 75 | 75 | 75 |
| 3 | Mac Core Package | Core Package - Mac | Managed Services / Managed IT Services | Device | $40 | $8.745–$91 | 70 | 70 | 71 |
| 4 | Security Awareness & Training Package via KnowBe4 | Security Awareness Package | Managed Services / Security | User | $5.5 | $2.5–$19 | 60 | 60 | 60 |
| 5 | Dormant macOS Device | Dormant macOS Device | Managed Services / Managed IT Services | Device | $3 | $0–$3 | 48 | 48 | 48 |
| 6 | Spanning O365 Cloud Backup | Backup - Spanning O365 | Managed Services / Remote Backup | User | $4 | $3–$7 | 46 | 46 | 46 |
| 7 | Core Server Management | Core Server Management | Managed Services / Managed IT Services | Device | $93 | $0–$530 | 41 | 41 | 41 |
| 8 | Network Monitoring | Monitoring - Network | Managed Services / Managed IT Services | Each | $265 | $0–$618 | 38 | 38 | 39 |
| 9 | ITDR a la carte | Managed ITDR | Managed Services / Security | User | $6 | $4–$12.5 | 29 | 29 | 30 |
| 10 | Cloud Backup for Workstations (Ninja Data Protection) | Backup - Managed Workstation | Managed Services / Remote Backup | Each | $23.5 | $8.5–$27 | 27 | 27 | 27 |
| 11 | WinSvrSTDCore ALNG LicSAPk MVL 2Lic CoreLic | SPLA License - WinSvrSTDCore | Software / Software | Each | $5.39 | $0–$10 | 25 | 25 | 29 |
| 12 | Enterprise Email Protection | Enterprise Email Protection | Managed Services / Security | Each | $7 | $3.75–$7.42 | 23 | 23 | 24 |
| 13 | Unlimited Support PC Package | Unlimited Support Package - PC | Managed Services / Managed IT Services | Device | $95.5 | $27.2–$107.5 | 23 | 23 | 23 |
| 14 | Spanning Google Cloud Backup | Backup - Spanning Google | Managed Services / Remote Backup | User | $4 | $1.95–$6 | 22 | 22 | 23 |
| 15 | Licensing and Storage | AvailableSystemInventory | Managed Services / Managed IT Services | Each | $6.6 | $6–$7 | 20 | 20 | 20 |
| 16 | LogMeIn Agent - per machine | LogMeIn | Managed Services / Managed IT Services | Each | $10 | $6.25–$13.5 | 19 | 19 | 19 |
| 17 | Unitrends server backups | Backup - Managed Server (P1) | Managed Services / Remote Backup | Each | $583 | $34–$618 | 17 | 17 | 17 |
| 18 | Open DNS Protection | DNS Protection Agent, DNS Protection Network | Managed Services / Managed IT Services | User | $3.25 | $0–$68 | 15 | 15 | 15 |
| 19 | "x" hours of remote/onsite support per month | Block Time - Recurring | Services Agreement / Recurring | Hour | $0 | $0–$200 | 12 | 12 | 12 |
| 20 | Unlimited Support Mac Package | Unlimited Support Package - Mac | Managed Services / Managed IT Services | Device | $95.5 | $27.2–$107.5 | 12 | 12 | 12 |
| 21 | Wireless access point | HaaS - Access Point | Managed Services / Managed IT Services | Each | $0 | $25–$102 | 12 | 12 | 12 |
| 22 | Breach Monitoring via HIBP (50 users or less) | Pwd/Acct Breach Detector (P1) | Managed Services / Security | Month | $50 | $50–$53 | 11 | 11 | 11 |
| 23 | BG + Cloud Radial access (50 users or less) | Help Desk Mgmt & Reporting (P1) | Managed Services / Managed IT Services | Month | $75 | $0–$53 | 10 | 10 | 10 |
| 24 | Breach Monitoring via HIBP (51 users or more) | Pwd/Acct Breach Detector (P2) | Managed Services / Security | Month | $100 | $100–$106 | 10 | 10 | 10 |
| 25 | Firewall monitoring | HaaS - Firewall | Managed Services / Managed IT Services | Each | $0 | $34–$159 | 10 | 10 | 10 |
| 26 | ISP Monitoring | Monitoring - ISP | Managed Services / Managed IT Services | Each | $132.5 | $84.5–$211.5 | 10 | 10 | 10 |

### Established or specialized (2–9 companies)

| # | Product name | ConnectWise identifier(s) | Category / subcategory | UOM | Catalog price | Observed unit price | Companies | Agreements | Additions |
|---:|---|---|---|---|---:|---:|---:|---:|---:|
| 27 | Sophos Extended Support | Sophos Extended Support | Managed Services / Security | Each | $150 | $154.5–$159 | 9 | 9 | 9 |
| 28 | Private Cloud Hosting | Hosting - Private Cloud | Managed Services / Managed IT Services | Each | $0 | $0–$418.5 | 8 | 8 | 8 |
| 29 | Mac Core Package Non-Profit Rate | CorePkgMacNonProfit | Managed Services / Managed IT Services | Device | $26.5 | $18–$41 | 7 | 7 | 7 |
| 30 | Switch | HaaS - Switch | Managed Services / Managed IT Services | Each | $0 | $35–$75 | 7 | 7 | 7 |
| 31 | Duo 2FA | Duo MFA | Managed Services / Security | Each | $3.5 | $3.3–$3.5 | 5 | 5 | 5 |
| 32 | Mid-tier plan | NordLayer - Core License, NordLayer - Core License (NP) | Managed Services / Managed IT Services | Each | $14 | $7–$14.84 | 5 | 5 | 5 |
| 33 | Mid-tier server plan | NordLayer - Core Server, NordLayer - Core Server (NP) | Managed Services / Managed IT Services | Each | $40 | $25–$40 | 5 | 5 | 5 |
| 34 | PC Core Package Non-Profit Rate | CorePkgPCNonProfit | Managed Services / Managed IT Services | Device | $26.5 | $19.25–$41 | 5 | 5 | 5 |
| 35 | Miscellaneous | Miscellaneous | Hardware / Hardware | Each | $0 | $0–$122 | 4 | 4 | 5 |
| 36 | Bandwidth: VoIP Taxes & Fees | Bandwidth VoIP Taxes & Fees | Managed Services / Managed IT Services | Month | $0 | $12–$50 | 4 | 4 | 4 |
| 37 | BG + Cloud Radial access (51 users or more) | Help Desk Mgmt & Reporting (P2) | Managed Services / Managed IT Services | Month | $150 | $100–$106 | 4 | 4 | 4 |
| 38 | Cloud Backup for Servers via NinjaOne | Backup - Managed Server (P2) | Managed Services / Remote Backup | Device | $265 | $68–$562 | 4 | 4 | 4 |
| 39 | Fully Managed Cisco Firewall | Managed Firewall | Managed Services / Managed IT Services | Each | $150 | $68–$204 | 4 | 4 | 4 |
| 40 | Monitoring - Appliance | Monitoring - Appliance | Managed Services / Managed IT Services | Each | $0 | $68–$181.5 | 4 | 4 | 4 |
| 41 | Managed Antivirus a la carte | Managed Antivirus Protection | Managed Services / Managed IT Services | Each | $6.5 | $3–$7 | 3 | 3 | 14 |
| 42 | Additional DID | SIP DID's | Managed Services / Managed IT Services | Each | $3.5 | $2.5 | 3 | 3 | 3 |
| 43 | Basic plan | NordLayer - Lite Plan License | Managed Services / Managed IT Services | Each | $10 | $10–$10.5 | 3 | 3 | 3 |
| 44 | Network Service | Network Service | Managed Services / Managed IT Services | Each | $0 | $27–$123.5 | 3 | 3 | 3 |
| 45 | Security+ Package (includes ITDR) | Security+ Package | Managed Services / Security | User | $10 | $4.25–$10.5 | 3 | 3 | 3 |
| 46 | Server | HaaS - Server | Managed Services / Managed IT Services | Each | $0 | $163–$340 | 3 | 3 | 3 |
| 47 | SF Line Access Charge (per DID) for Bandwidth | Bandwidth SF Line Access Charge | Services Agreement / One Time | Each | $3.73 | $4 | 3 | 3 | 3 |
| 48 | SIP Trunk per channel | Sip Trunk | Managed Services / Managed IT Services | Each | $41 | $61–$326.5 | 3 | 3 | 3 |
| 49 | $1500 minimum agreement for smaller businesses | Minimum Contract Requirement | Managed Services / Managed IT Services | Month | $0 | $530–$650 | 2 | 2 | 2 |
| 50 | Backup - Spanning Salesforce | Backup - Spanning Salesforce | Managed Services / Remote Backup | User | $4 | $4.25 | 2 | 2 | 2 |
| 51 | Backup Solution | Backup | Managed Services / Remote Backup | Each | $0 | $340–$544 | 2 | 2 | 2 |
| 52 | Generic Cloud Backup for Servers | Backup - Managed Server | Managed Services / Remote Backup | Device | $265 | $31.8–$250 | 2 | 2 | 2 |
| 53 | Managed Server | Monitoring - Server | Managed Services / Managed IT Services | Each | $87.5 | $20.5–$136 | 2 | 2 | 2 |
| 54 | Ongoing Monthly Maintenance | Monthly Maintenance | Managed Services / Managed IT Services | Flat Fee | $0 | $165–$432.5 | 2 | 2 | 2 |
| 55 | Phone Appliance Monitoring | Monitoring - Phone Appliance | Managed Services / Managed IT Services | Each | $64 | $68–$75 | 2 | 2 | 2 |
| 56 | Phone Support Fee | Phone Support Fee | Managed Services / Managed IT Services | Each | $0 | $75–$123.5 | 2 | 2 | 2 |
| 57 | Private Cloud Instance | Hosting - Private Cloud Inst. | Managed Services / Managed IT Services | Each | $200 | $145.75–$442 | 2 | 2 | 2 |

### Long tail (1 company)

| # | Product name | ConnectWise identifier(s) | Category / subcategory | UOM | Catalog price | Observed unit price | Companies | Agreements | Additions |
|---:|---|---|---|---|---:|---:|---:|---:|---:|
| 58 | Computer | HaaS - Computer | Managed Services / Managed IT Services | Each | $0 | $33.5–$39.5 | 1 | 1 | 4 |
| 59 | Billing Adjustment | Billing Adjustment | Services Agreement / One Time | Each | $0 | $-237.11 | 1 | 1 | 1 |
| 60 | ConnectSecure | Vulnerability Mgmt + Comp | Managed Services / Managed IT Services | User | $5.5 | $4.25 | 1 | 1 | 1 |
| 61 | Core Server Management justanswer.in.server | CoreSrvrMgmtJA.in | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 62 | Core Server Management justanswer.ua.server | CoreSrvrMgmtJA.ua | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 63 | Core Server Management justanswer.us.server | CoreSrvrMgmtJA.us | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 64 | Core Server Management Wine - Corp | CoreSrvrMgmtWine - Corp | Managed Services / Managed IT Services | Each | $14 | $14 | 1 | 1 | 1 |
| 65 | Google Workspace Mobile Device Mgmt | Google Mobile Device Mgmt | Managed Services / Managed IT Services | Each | $0 | $0 | 1 | 1 | 1 |
| 66 | Hosted Cold Storage | Server - Hosted Cold Storage | Managed Services / Managed IT Services | Each | $100 | $100 | 1 | 1 | 1 |
| 67 | Huntress Security Information and Event Management | Managed SIEM | Managed Services / Security | Each | $75 | $200 | 1 | 1 | 1 |
| 68 | iPads | CorePkgiPadPomeroy | Managed Services / Managed IT Services | Device | $0 | $0 | 1 | 1 | 1 |
| 69 | Managed user-owned devices | Core Package - BYOD | Managed Services / Managed IT Services | Device | $40 | $20.5 | 1 | 1 | 1 |
| 70 | Microsoft 365 Business Basic Non-Profit Donation | MSFT Bus Basic NP Donation | Microsoft / MSFT Licenses | Each | $0 | $0 | 1 | 1 | 1 |
| 71 | Microsoft 365 Business Premium NCE | MSFT Microsoft 365 Bus P NCE | Microsoft / MSFT Licenses | Each | $26.4 | $26.4 | 1 | 1 | 1 |
| 72 | Microsoft 365 Business Standard | MSFT Microsoft 365 Standard | Microsoft / MSFT Licenses | Each | $12.5 | $15 | 1 | 1 | 1 |
| 73 | O365 Audio Conferencing Select Dial Out | MSFT Audio Conf Dial out | Microsoft / MSFT Licenses | Each | $0 | $0 | 1 | 1 | 1 |
| 74 | OfficeProPlus ALNG LicSAPk MVL SAL | SPLA License - OfficeProPlus | Software / Software | Each | $20.65 | $20.65 | 1 | 1 | 1 |
| 75 | PC Core Package for Southward devices | CorePkgWorkstations.SW | Managed Services / Managed IT Services | Each | $40 | $40 | 1 | 1 | 1 |
| 76 | PC Core Package for Southward Rightworks devices | CorePkgRightworks.SW | Managed Services / Managed IT Services | Each | $10 | $10 | 1 | 1 | 1 |
| 77 | PC Core Package justanswer.engineering | CorePkgPCJA.eng | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 78 | PC Core Package justanswer.in.workstation | CorePkgPCJA.in.wrkstn | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 79 | PC Core Package justanswer.ua.lv | CorePkgPCJA.ua.lv | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 80 | PC Core Package justanswer.ua.uz | CorePkgPCJA.ua.uz | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 81 | PC Core Package justanswer.us | CorePkgPCJA.us | Managed Services / Managed IT Services | Each | $19 | $19 | 1 | 1 | 1 |
| 82 | PC or Mac Core Package per user | Core Package - Per User | Managed Services / Managed IT Services | User | $40 | $26.5 | 1 | 1 | 1 |
| 83 | PCIDSS Service w/ SAQ A | PCIDSS Service w/ SAQ A | Managed Services / Managed IT Services | Flat Fee | $975 | $920 | 1 | 1 | 1 |
| 84 | Phone | Hardware - Phone | Hardware / Hardware | Each | $0 | $29.5 | 1 | 1 | 1 |
| 85 | Premium Unlimited Support Mac Package | Prem Unlimited Support Mac Pkg | Managed Services / Managed IT Services | Each | $146 | $146 | 1 | 1 | 1 |
| 86 | Premium Unlimited Support PC Package | Prem Unlimited Support PC Pkg | Managed Services / Managed IT Services | Each | $146 | $146 | 1 | 1 | 1 |
| 87 | Reflexion Spam Filter | Managed SPAM Filtering | Managed Services / Web and E-mail Services | Each | $2.5 | $3 | 1 | 1 | 1 |
| 88 | Remote VPN | VPN - Twingate | Managed Services / Web and E-mail Services | Each | $6.5 | $6.5 | 1 | 1 | 1 |
| 89 | Router | HaaS - Router | Managed Services / Managed IT Services | Each | $0 | $109 | 1 | 1 | 1 |
| 90 | Security - Vulnerability Scan | Security - Vulnerability Scan | Managed Services / Security | Each | $212 | $53 | 1 | 1 | 1 |
| 91 | Security policy via BitWarden | Enterprise Password Manager | Software / Software | User | $7 | $6.5 | 1 | 1 | 1 |
| 92 | Security++ Package (includes ITDR) | Security++ Package | Managed Services / Security | User | $15 | $15.9 | 1 | 1 | 1 |
| 93 | Shared Webhosting | Webhosting | Managed Services / Web and E-mail Services | Each | $0 | $305 | 1 | 1 | 1 |
| 94 | Sip Toll Free Number | Sip Toll Free Number | Managed Services / Managed IT Services | Each | $17.5 | $13.5 | 1 | 1 | 1 |
| 95 | SQLSvrWeb ALNG LicSAPk MVL 2Lic CoreLic | SPLA License - SQLSvrWeb | Software / Software | Each | $10 | $10 | 1 | 1 | 1 |
| 96 | SRC-AADCONNECT | SPLA License -SRC-AAD | Software / Software | Each | $5.39 | $5.39 | 1 | 1 | 1 |
| 97 | Streamline IT license | Streamline IT | Managed Services / Managed IT Services | Each | $46.5 | $44 | 1 | 1 | 1 |
| 98 | Unlimited Support Mac Package NP | UnlimitedSupportPkgMacNP | Managed Services / Managed IT Services | Device | $48 | $48 | 1 | 1 | 1 |
| 99 | Unlimited Support PC Package NP | UnlimitedSupportPkgPCNP | Managed Services / Managed IT Services | Device | $48 | $95 | 1 | 1 | 1 |

## Recommended next review

Before changing Admin → Products, decide which rows represent independently sellable offerings rather than bundled components, operational charges, or customer-specific legacy SKUs. For selected rows, the ConnectWise customer description can populate the portal description; category/subcategory can seed the category; unit of measure can guide the pricing model; and the observed agreement range can inform the low/high monthly assumptions.
