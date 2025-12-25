"""
KPI Discovery Streaming Handler

Orchestrates the KPI discovery multi-agent pipeline with real-time streaming
of reasoning tokens from each agent.

Pipeline: DomainAnalyzer -> KPIDiscoverer -> KPIEnricher -> ValueRanker

Each agent's reasoning and content is streamed as events for the frontend to display.
"""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import settings
from app.core.ai.kpi_discovery.state import (
    DomainAnalysisResult,
    DiscoveredKPI,
    EnrichedKPI,
    RankedKPI,
    CandidateKPI,
    KPICategory,
    KPIFrequency,
)
from app.core.ai.prompts.kpi_discovery.domain_analyzer import (
    DOMAIN_ANALYZER_SYSTEM,
    DOMAIN_ANALYZER_PROMPT,
)
from app.core.ai.prompts.kpi_discovery.kpi_discoverer import (
    KPI_DISCOVERER_SYSTEM,
    KPI_DISCOVERER_PROMPT,
)
from app.core.ai.prompts.kpi_discovery.kpi_enricher import (
    KPI_ENRICHER_SYSTEM,
    KPI_ENRICHER_PROMPT,
)
from app.core.ai.prompts.kpi_discovery.value_ranker import (
    VALUE_RANKER_SYSTEM,
    VALUE_RANKER_PROMPT,
)
from app.services.streaming_agent_executor import (
    stream_with_structured_output,
    stream_without_structured_output,
)

logger = logging.getLogger(__name__)


# Agent descriptions for UI display
AGENT_DESCRIPTIONS = {
    "domain_analyzer": "Analyzing business domain and value propositions",
    "kpi_discoverer": "Suggesting business KPIs for the domain",
    "kpi_enricher": "Adding calculation methods and data sources",
    "value_ranker": "Ranking KPIs by business value",
}

# Agent weights for progress calculation (sum = 100)
AGENT_WEIGHTS = {
    "domain_analyzer": 25,
    "kpi_discoverer": 30,
    "kpi_enricher": 30,
    "value_ranker": 15,
}


class DiscoveredKPIsResponse(BaseModel):
    """Response format for KPI discoverer."""
    kpis: List[DiscoveredKPI] = Field(default_factory=list)


class EnrichedKPIsResponse(BaseModel):
    """Response format for KPI enricher."""
    enriched_kpis: List[EnrichedKPI] = Field(default_factory=list)


def format_file_tree(file_list: List[str], max_items: int = 50) -> str:
    """Format file tree for display."""
    if not file_list:
        return "(empty)"
    files = file_list[:max_items]
    tree = "\n".join(files)
    if len(file_list) > max_items:
        tree += f"\n... and {len(file_list) - max_items} more files"
    return tree


def format_key_files(key_files: List[dict], max_content_length: int = 2000) -> str:
    """Format key files content for the prompt."""
    if not key_files:
        return "(no key files available)"
    parts = []
    for f in key_files:
        path = f.get("path", "unknown")
        content = f.get("content", "")
        if content:
            if len(content) > max_content_length:
                content = content[:max_content_length] + "\n... (truncated)"
            parts.append(f"### {path}\n```\n{content}\n```")
        else:
            parts.append(f"### {path}\n(content not available)")
    return "\n\n".join(parts)


def format_dependencies(repo_analysis: dict) -> str:
    """Format package dependencies."""
    parts = []
    package_json = repo_analysis.get("package_json")
    if package_json:
        deps = package_json.get("dependencies", {})
        if deps:
            parts.append("### package.json dependencies")
            parts.append(json.dumps(deps, indent=2))
    requirements = repo_analysis.get("requirements_txt")
    if requirements:
        parts.append("### requirements.txt")
        parts.append(requirements)
    return "\n\n".join(parts) if parts else "(no dependencies found)"


def format_discovered_kpis(kpis: List[dict]) -> str:
    """Format discovered KPIs for enrichment."""
    if not kpis:
        return "(none)"
    parts = []
    for k in kpis:
        parts.append(f"### {k.get('temp_id', 'unknown')}: {k.get('name', 'Untitled')}")
        parts.append(f"**Definition**: {k.get('definition', 'N/A')}")
        parts.append(f"**Category**: {k.get('category', 'unknown')}")
        parts.append(f"**Business Relevance**: {k.get('business_relevance', 'N/A')}")
        parts.append("")
    return "\n".join(parts)


def format_enriched_kpis(kpis: List[dict]) -> str:
    """Format enriched KPIs for ranking."""
    if not kpis:
        return "(none)"
    parts = []
    for k in kpis:
        parts.append(f"### {k.get('temp_id', 'unknown')}: {k.get('name', 'Untitled')}")
        parts.append(f"**Category**: {k.get('category', 'unknown')}")
        parts.append(f"**Definition**: {k.get('definition', 'N/A')}")
        parts.append(f"**Calculation**: {k.get('calculation_method', 'N/A')}")
        parts.append(f"**Business Value**: {k.get('business_value', 'N/A')}")
        parts.append(f"**Frequency**: {k.get('frequency', 'N/A')}")
        parts.append("")
    return "\n".join(parts)


def merge_ranking_with_enriched(enriched: List[dict], rankings: List[dict]) -> List[dict]:
    """Merge ranking data with enriched KPIs to create candidates."""
    ranking_by_id = {r["temp_id"]: r for r in rankings}
    candidates = []
    for k in enriched:
        temp_id = k.get("temp_id")
        ranking = ranking_by_id.get(temp_id, {})
        candidate = CandidateKPI(
            temp_id=temp_id or "unknown",
            name=k.get("name", "Untitled"),
            definition=k.get("definition", ""),
            category=str(k.get("category", "efficiency")),
            calculation_method=k.get("calculation_method", ""),
            data_sources=k.get("data_sources", []),
            unit=k.get("unit"),
            frequency=str(k.get("frequency", "monthly")),
            target_guidance=k.get("target_guidance"),
            business_value=k.get("business_value", ""),
            priority=ranking.get("priority", "medium"),
            priority_score=ranking.get("priority_score", 50),
            impact_areas=k.get("impact_areas", []),
        )
        candidates.append(candidate.model_dump())
    candidates.sort(key=lambda x: x["priority_score"], reverse=True)
    return candidates


async def execute_kpi_discovery_with_streaming(
    repo_analysis: dict,
    project_id: str,
    existing_kpis: Optional[List[dict]] = None,
    user_context: Optional[str] = None,
    focus_categories: Optional[List[str]] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Execute the KPI discovery pipeline with real-time streaming.

    The agent autonomously determines the optimal number of KPIs based on
    application complexity (3-5 for small, 5-8 for medium, 8-12 for large).

    Yields events as each agent processes:
    - agent_start: When an agent begins
    - reasoning: GPT-5 thinking tokens
    - content: Response content tokens
    - agent_complete: When an agent finishes
    - progress: Progress update (0-100)
    - complete: Final candidate KPIs
    - error: If something fails

    Args:
        repo_analysis: Repository analysis data from GitHub
        project_id: The project ID
        existing_kpis: KPIs already in the project
        user_context: Optional user guidance
        focus_categories: Categories to focus on

    Yields:
        Streaming events for the frontend
    """
    logger.info(f"[KPIDiscovery] Starting pipeline for project {project_id}")

    # Track state
    state: Dict[str, Any] = {
        "repo_analysis": repo_analysis,
        "project_id": project_id,
        "existing_kpis": existing_kpis or [],
        "user_context": user_context,
        "focus_categories": focus_categories or [],
        "domain_analysis": None,
        "discovered_kpis": [],
        "enriched_kpis": [],
        "candidate_kpis": [],
    }

    progress = 0

    def update_progress(agent: str):
        nonlocal progress
        progress += AGENT_WEIGHTS.get(agent, 10)
        return min(progress, 100)

    try:
        # ===== DOMAIN ANALYZER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "domain_analyzer",
            "description": AGENT_DESCRIPTIONS["domain_analyzer"]
        }

        user_context_section = f"\n## User Guidance\n{user_context}\n" if user_context else ""

        domain_analyzer_prompt = DOMAIN_ANALYZER_PROMPT.format(
            owner=repo_analysis.get("owner", "unknown"),
            repo_name=repo_analysis.get("repo_name", "unknown"),
            description=repo_analysis.get("description", "(no description)") or "(no description)",
            language=repo_analysis.get("language", "unknown"),
            topics=", ".join(repo_analysis.get("topics", [])) or "(none)",
            readme_content=repo_analysis.get("readme_content", "(no README)") or "(no README)",
            key_files_content=format_key_files(repo_analysis.get("key_files", [])),
            dependencies=format_dependencies(repo_analysis),
            user_context_section=user_context_section,
        )

        domain_analysis = None
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": DOMAIN_ANALYZER_SYSTEM},
                {"role": "user", "content": domain_analyzer_prompt}
            ],
            model=settings.MODEL_KPI_DOMAIN_ANALYZER,
            response_model=DomainAnalysisResult,
            agent_name="domain_analyzer",
        ):
            if event["type"] == "reasoning":
                yield {"type": "reasoning", "agent": "domain_analyzer", "token": event.get("token", "")}
            elif event["type"] == "content":
                yield {"type": "content", "agent": "domain_analyzer", "token": event.get("token", "")}
            elif event["type"] == "parsed":
                domain_analysis = event["data"]

        if not domain_analysis:
            raise ValueError("Domain analyzer failed to produce result")

        state["domain_analysis"] = domain_analysis.model_dump() if hasattr(domain_analysis, "model_dump") else domain_analysis

        yield {
            "type": "agent_complete",
            "agent": "domain_analyzer",
            "summary": f"Analyzed {domain_analysis.business_domain} domain with {len(domain_analysis.core_workflows)} workflows",
            "progress": update_progress("domain_analyzer"),
        }

        # ===== KPI DISCOVERER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "kpi_discoverer",
            "description": AGENT_DESCRIPTIONS["kpi_discoverer"]
        }

        existing_kpis_str = "\n".join([
            f"- {k.get('name', 'Untitled')} ({k.get('category', 'unknown')})"
            for k in (existing_kpis or [])
        ]) or "(none)"

        focus_categories_section = ""
        if focus_categories:
            focus_categories_section = f"\n## Focus on These Categories\n{', '.join(focus_categories)}\n"

        discoverer_prompt = KPI_DISCOVERER_PROMPT.format(
            domain_analysis=json.dumps(state["domain_analysis"], indent=2),
            existing_kpis=existing_kpis_str,
            user_context_section=user_context_section,
            focus_categories_section=focus_categories_section,
        )

        discovered_kpis = []
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": KPI_DISCOVERER_SYSTEM},
                {"role": "user", "content": discoverer_prompt}
            ],
            model=settings.MODEL_KPI_DISCOVERER,
            response_model=DiscoveredKPIsResponse,
            agent_name="kpi_discoverer",
        ):
            if event["type"] == "reasoning":
                yield {"type": "reasoning", "agent": "kpi_discoverer", "token": event.get("token", "")}
            elif event["type"] == "content":
                yield {"type": "content", "agent": "kpi_discoverer", "token": event.get("token", "")}
            elif event["type"] == "parsed":
                discovered_kpis = [k.model_dump() for k in event["data"].kpis]

        state["discovered_kpis"] = discovered_kpis

        # Yield previews
        for k in discovered_kpis:
            yield {
                "type": "kpi_preview",
                "temp_id": k.get("temp_id"),
                "name": k.get("name"),
                "category": k.get("category"),
            }

        yield {
            "type": "agent_complete",
            "agent": "kpi_discoverer",
            "summary": f"Discovered {len(discovered_kpis)} potential KPIs",
            "count": len(discovered_kpis),
            "progress": update_progress("kpi_discoverer"),
        }

        # ===== KPI ENRICHER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "kpi_enricher",
            "description": AGENT_DESCRIPTIONS["kpi_enricher"]
        }

        if not discovered_kpis:
            yield {
                "type": "agent_complete",
                "agent": "kpi_enricher",
                "summary": "No KPIs to enrich",
                "count": 0,
                "progress": update_progress("kpi_enricher"),
            }
            yield {
                "type": "complete",
                "kpis": [],
                "total": 0,
            }
            return

        enricher_prompt = KPI_ENRICHER_PROMPT.format(
            domain_analysis=json.dumps(state["domain_analysis"], indent=2),
            owner=repo_analysis.get("owner", "unknown"),
            repo_name=repo_analysis.get("repo_name", "unknown"),
            language=repo_analysis.get("language", "unknown"),
            file_tree_summary=format_file_tree(repo_analysis.get("file_tree", [])),
            discovered_kpis=format_discovered_kpis(discovered_kpis),
        )

        enriched_kpis = []
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": KPI_ENRICHER_SYSTEM},
                {"role": "user", "content": enricher_prompt}
            ],
            model=settings.MODEL_KPI_ENRICHER,
            response_model=EnrichedKPIsResponse,
            agent_name="kpi_enricher",
        ):
            if event["type"] == "reasoning":
                yield {"type": "reasoning", "agent": "kpi_enricher", "token": event.get("token", "")}
            elif event["type"] == "content":
                yield {"type": "content", "agent": "kpi_enricher", "token": event.get("token", "")}
            elif event["type"] == "parsed":
                enriched_kpis = [k.model_dump() for k in event["data"].enriched_kpis]

        state["enriched_kpis"] = enriched_kpis

        yield {
            "type": "agent_complete",
            "agent": "kpi_enricher",
            "summary": f"Enriched {len(enriched_kpis)} KPIs with implementation details",
            "count": len(enriched_kpis),
            "progress": update_progress("kpi_enricher"),
        }

        # ===== VALUE RANKER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "value_ranker",
            "description": AGENT_DESCRIPTIONS["value_ranker"]
        }

        ranker_prompt = VALUE_RANKER_PROMPT.format(
            domain_analysis=json.dumps(state["domain_analysis"], indent=2),
            enriched_kpis=format_enriched_kpis(enriched_kpis),
        )

        rankings = []
        async for event in stream_without_structured_output(
            messages=[
                {"role": "system", "content": VALUE_RANKER_SYSTEM},
                {"role": "user", "content": ranker_prompt}
            ],
            model=settings.MODEL_KPI_VALUE_RANKER,
            agent_name="value_ranker",
        ):
            if event["type"] == "content":
                yield {"type": "content", "agent": "value_ranker", "token": event.get("token", "")}
            elif event["type"] == "complete":
                try:
                    result = json.loads(event["content"])
                    rankings = result.get("ranked_kpis", [])
                except json.JSONDecodeError:
                    logger.error("[ValueRanker] Failed to parse rankings")
                    rankings = []

        # Merge rankings with enriched KPIs
        candidates = merge_ranking_with_enriched(enriched_kpis, rankings)
        state["candidate_kpis"] = candidates

        yield {
            "type": "agent_complete",
            "agent": "value_ranker",
            "summary": f"Ranked {len(candidates)} KPIs by business value",
            "count": len(candidates),
            "progress": 100,
        }

        # ===== COMPLETE =====
        yield {
            "type": "complete",
            "kpis": candidates,
            "total": len(candidates),
        }

        logger.info(f"[KPIDiscovery] Pipeline complete: {len(candidates)} candidates")

    except Exception as e:
        logger.error(f"[KPIDiscovery] Pipeline error: {e}", exc_info=True)
        yield {
            "type": "error",
            "message": str(e),
        }
