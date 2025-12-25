"""Flowchart Operation Handler (Mermaid.js)"""

import logging
from typing import Optional

from app.modules.flowchart.models import (
    FlowchartContext,
    FlowchartOperationResponse,
)

logger = logging.getLogger(__name__)


class FlowchartOperationHandler:
    """Handles flowchart operations from AI tool calls"""

    def handle_tool_call(
        self,
        tool_name: str,
        arguments: dict,
        context: Optional[FlowchartContext] = None
    ) -> FlowchartOperationResponse:
        """Process a tool call and return the operation response"""

        handlers = {
            "generate_flowchart": self._handle_generate,
            "add_nodes": self._handle_add_nodes,
            "modify_flowchart": self._handle_modify,
            "delete_elements": self._handle_delete,
            "create_subgraph": self._handle_create_subgraph,
            "expand_node": self._handle_expand_node,
            "change_direction": self._handle_change_direction,
            "apply_style": self._handle_apply_style,
        }

        handler = handlers.get(tool_name)
        if not handler:
            return FlowchartOperationResponse(
                success=False,
                operation_type="unknown",
                message=f"Unknown tool: {tool_name}"
            )

        try:
            return handler(arguments, context)
        except Exception as e:
            logger.error(f"Error handling {tool_name}: {e}", exc_info=True)
            return FlowchartOperationResponse(
                success=False,
                operation_type=tool_name,
                message=f"Error: {str(e)}"
            )

    def _handle_generate(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle full flowchart generation"""
        title = args.get("title", "Flowchart")
        mermaid_code = args.get("mermaid_code", "")

        if not mermaid_code:
            return FlowchartOperationResponse(
                success=False,
                operation_type="generate",
                message="No Mermaid code provided"
            )

        # Clean up the code
        mermaid_code = self._clean_mermaid_code(mermaid_code)

        # Count elements for message
        node_count = mermaid_code.count("[") + mermaid_code.count("(") + mermaid_code.count("{")
        edge_count = mermaid_code.count("-->")

        return FlowchartOperationResponse(
            success=True,
            operation_type="generate",
            message=f"Generated flowchart '{title}' with approximately {node_count} nodes and {edge_count} connections",
            mermaid_code=mermaid_code
        )

    def _handle_add_nodes(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle adding nodes to existing flowchart"""
        mermaid_lines = args.get("mermaid_lines", [])
        connect_from = args.get("connect_from")

        if not mermaid_lines:
            return FlowchartOperationResponse(
                success=False,
                operation_type="add",
                message="No lines to add"
            )

        # Build the code to append
        code_to_append = "\n".join(mermaid_lines)

        # If we have context, append to existing code
        if context and context.mermaidCode:
            # Remove trailing 'end' if inside a subgraph
            existing = context.mermaidCode.rstrip()

            # Find where to insert (before any trailing 'end' statements)
            lines = existing.split('\n')

            # Simply append the new lines
            new_code = existing + "\n" + code_to_append

            return FlowchartOperationResponse(
                success=True,
                operation_type="add",
                message=f"Added {len(mermaid_lines)} lines to flowchart",
                mermaid_code=new_code
            )

        return FlowchartOperationResponse(
            success=True,
            operation_type="add",
            message=f"Added {len(mermaid_lines)} lines",
            code_to_append=code_to_append
        )

    def _handle_modify(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle modifying the flowchart"""
        mermaid_code = args.get("mermaid_code", "")
        changes_summary = args.get("changes_summary", "Flowchart modified")

        if not mermaid_code:
            return FlowchartOperationResponse(
                success=False,
                operation_type="modify",
                message="No Mermaid code provided"
            )

        mermaid_code = self._clean_mermaid_code(mermaid_code)

        return FlowchartOperationResponse(
            success=True,
            operation_type="modify",
            message=changes_summary,
            mermaid_code=mermaid_code
        )

    def _handle_delete(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle deleting elements"""
        mermaid_code = args.get("mermaid_code", "")
        deleted_elements = args.get("deleted_elements", [])

        if not mermaid_code:
            return FlowchartOperationResponse(
                success=False,
                operation_type="delete",
                message="No Mermaid code provided"
            )

        mermaid_code = self._clean_mermaid_code(mermaid_code)

        return FlowchartOperationResponse(
            success=True,
            operation_type="delete",
            message=f"Deleted {len(deleted_elements)} elements: {', '.join(deleted_elements[:5])}{'...' if len(deleted_elements) > 5 else ''}",
            mermaid_code=mermaid_code
        )

    def _handle_create_subgraph(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle creating a subgraph"""
        mermaid_code = args.get("mermaid_code", "")
        subgraph_name = args.get("subgraph_name", "Group")

        if not mermaid_code:
            return FlowchartOperationResponse(
                success=False,
                operation_type="subgraph",
                message="No Mermaid code provided"
            )

        mermaid_code = self._clean_mermaid_code(mermaid_code)

        return FlowchartOperationResponse(
            success=True,
            operation_type="subgraph",
            message=f"Created subgraph '{subgraph_name}'",
            mermaid_code=mermaid_code
        )

    def _handle_expand_node(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle expanding a node into sub-steps"""
        node_id = args.get("node_id", "")
        mermaid_code = args.get("mermaid_code", "")
        expansion_summary = args.get("expansion_summary", "Node expanded")

        if not mermaid_code:
            return FlowchartOperationResponse(
                success=False,
                operation_type="expand",
                message="No Mermaid code provided"
            )

        mermaid_code = self._clean_mermaid_code(mermaid_code)

        return FlowchartOperationResponse(
            success=True,
            operation_type="expand",
            message=f"Expanded node '{node_id}': {expansion_summary}",
            mermaid_code=mermaid_code
        )

    def _handle_change_direction(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle changing flow direction"""
        direction = args.get("direction", "TB")
        mermaid_code = args.get("mermaid_code", "")

        if not mermaid_code:
            # If no code provided but we have context, update direction in existing code
            if context and context.mermaidCode:
                mermaid_code = context.mermaidCode
                # Replace direction in first line
                lines = mermaid_code.split('\n')
                if lines and lines[0].strip().startswith('flowchart'):
                    lines[0] = f"flowchart {direction}"
                    mermaid_code = '\n'.join(lines)

        if not mermaid_code:
            return FlowchartOperationResponse(
                success=False,
                operation_type="direction",
                message="No Mermaid code provided"
            )

        mermaid_code = self._clean_mermaid_code(mermaid_code)

        direction_names = {
            "TB": "top to bottom",
            "TD": "top to bottom",
            "BT": "bottom to top",
            "LR": "left to right",
            "RL": "right to left",
        }

        return FlowchartOperationResponse(
            success=True,
            operation_type="direction",
            message=f"Changed flow direction to {direction_names.get(direction, direction)}",
            mermaid_code=mermaid_code
        )

    def _handle_apply_style(
        self, args: dict, context: Optional[FlowchartContext]
    ) -> FlowchartOperationResponse:
        """Handle applying styles to the flowchart"""
        mermaid_code = args.get("mermaid_code", "")
        style_summary = args.get("style_summary", "Styles applied")

        if not mermaid_code:
            return FlowchartOperationResponse(
                success=False,
                operation_type="style",
                message="No Mermaid code provided"
            )

        mermaid_code = self._clean_mermaid_code(mermaid_code)

        return FlowchartOperationResponse(
            success=True,
            operation_type="style",
            message=style_summary,
            mermaid_code=mermaid_code
        )

    def _clean_mermaid_code(self, code: str) -> str:
        """Clean and normalize Mermaid code"""
        # Remove markdown code fences if present
        code = code.strip()
        if code.startswith("```mermaid"):
            code = code[10:]
        elif code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]

        code = code.strip()

        # Ensure it starts with flowchart directive
        if not code.startswith("flowchart") and not code.startswith("graph"):
            code = "flowchart TB\n" + code

        return code


# Singleton instance
flowchart_operation_handler = FlowchartOperationHandler()
