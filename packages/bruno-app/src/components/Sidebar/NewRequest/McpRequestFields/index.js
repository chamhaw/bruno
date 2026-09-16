import React from 'react';
import { MCP_METHODS } from 'utils/mcp';

const McpRequestFields = ({ formik }) => {
  const isToolCall = formik.values.mcpMethod === MCP_METHODS.TOOLS_CALL;

  return (
    <>
      <div className="mt-4">
        <label htmlFor="mcp-method" className="block font-medium">
          MCP Method
        </label>
        <select
          id="mcp-method"
          name="mcpMethod"
          className="block textbox mt-2 w-full"
          value={formik.values.mcpMethod}
          onChange={formik.handleChange}
          data-testid="mcp-method"
        >
          <option value={MCP_METHODS.TOOLS_CALL}>{MCP_METHODS.TOOLS_CALL}</option>
          <option value={MCP_METHODS.TOOLS_LIST}>{MCP_METHODS.TOOLS_LIST}</option>
        </select>
      </div>
      {isToolCall ? (
        <>
          <div className="mt-4">
            <label htmlFor="tool-name" className="block font-medium">
              Tool Name
            </label>
            <input
              id="tool-name"
              type="text"
              name="toolName"
              placeholder="Tool Name"
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.toolName || ''}
              data-testid="tool-name"
            />
            {formik.touched.toolName && formik.errors.toolName ? (
              <div className="text-red-500" data-testid="form-error">{formik.errors.toolName}</div>
            ) : null}
          </div>
          <div className="mt-4">
            <label htmlFor="tool-arguments" className="block font-medium">
              Arguments
            </label>
            <textarea
              id="tool-arguments"
              name="toolArguments"
              placeholder="JSON object of arguments"
              className="block textbox w-full mt-2 mcp-arguments"
              value={formik.values.toolArguments}
              onChange={formik.handleChange}
              data-testid="tool-arguments"
            >
            </textarea>
            {formik.touched.toolArguments && formik.errors.toolArguments ? (
              <div className="text-red-500">{formik.errors.toolArguments}</div>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
};

export default McpRequestFields;
