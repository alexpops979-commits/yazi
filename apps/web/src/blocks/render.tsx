import { Fragment, type ReactNode } from 'react';
import type { PageDocument, PageNode } from '@yazi/page-schema';
import { getBlockDefinition } from './registry';
import type { RenderContext } from './types';

export function renderNode(node: PageNode, ctx: RenderContext): ReactNode {
  const definition = getBlockDefinition(node.type);
  if (!definition) {
    return (
      <div key={node.id} data-pb-id={node.id} style={{ padding: 12, border: '1px dashed #cbd5e1', fontSize: 12, color: '#94a3b8' }}>
        Unknown block: {node.type}
      </div>
    );
  }

  const children = node.children?.map((child) => <Fragment key={child.id}>{renderNode(child, ctx)}</Fragment>);

  return (
    <Fragment key={node.id}>
      {definition.render({
        node,
        props: node.props ?? {},
        style: node.style ?? {},
        children,
        ctx,
      })}
    </Fragment>
  );
}

export function PageRenderer({
  document,
  ctx,
  innerRef,
}: {
  document: PageDocument;
  ctx: RenderContext;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={innerRef} className={`pb-root${ctx.mode === 'editor' ? ' pb-canvas' : ''}`} data-pb-root="">
      {document.sections.map((section) => (
        <Fragment key={section.id}>{renderNode(section, ctx)}</Fragment>
      ))}
    </div>
  );
}
