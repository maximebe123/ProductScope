import { NodeTypes } from 'reactflow'
import BaseNode from './BaseNode'
import GroupNode from './GroupNode'

// Node types registry
export const customNodeTypes: NodeTypes = {
  customNode: BaseNode,
  groupNode: GroupNode,
}
