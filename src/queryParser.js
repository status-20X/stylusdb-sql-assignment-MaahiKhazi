// src/queryParser.js

function parseJoinClause(query) {
    const joinRegex = /\s(INNER|LEFT|RIGHT) JOIN\s(.+?)\sON\s([\w.]+)\s*=\s*([\w.]+)/i;
    const joinMatch = query.match(joinRegex);

    if (joinMatch) {
        return {
            joinType: joinMatch[1].trim(),
            joinTable: joinMatch[2].trim(),
            joinCondition: {
                left: joinMatch[3].trim(),
                right: joinMatch[4].trim()
            }
        };
    }

    return {
        joinType: null,
        joinTable: null,
        joinCondition: null
    };
}

function parseQuery(query) {
    try{
        query = query.trim();

        let isDistinct = false;

        // Check for DISTINCT keyword and update the query
        if (query.toUpperCase().includes('SELECT DISTINCT')) {
            isDistinct = true;
            query = query.replace('SELECT DISTINCT', 'SELECT');
        }

        const limitRegex = /\sLIMIT\s(\d+)/i;
        const limitMatch = query.match(limitRegex);

        let limit = null;
        if (limitMatch) {
            limit = parseInt(limitMatch[1], 10);
            query = query.replace(limitRegex, '');
        }

        const orderByRegex = /\sORDER BY\s(.+)/i;
        const orderByMatch = query.match(orderByRegex);

        let orderByFields = null;
        if (orderByMatch) {
            orderByFields = orderByMatch[1].split(',').map(field => {
                const [fieldName, order] = field.trim().split(/\s+/);
                return { fieldName, order: order ? order.toUpperCase() : 'ASC' };
            });
        }
        query = query.replace(orderByRegex, '');

        const groupBySplit = query.split(/\sGROUP BY\s/i);
        const queryWithoutGroupBy = groupBySplit[0];
        // Initialize variables for different parts of the query
        let selectPart, fromPart;

        let groupByFields = groupBySplit.length > 1 ? groupBySplit[1].trim().split(',').map(field => field.trim()) : null;

        // Split the query at the WHERE clause if it exists
        const whereSplit = queryWithoutGroupBy.split(/\sWHERE\s/i);
        const queryWithoutWhere = whereSplit[0]; // Everything before WHERE clause

        // WHERE clause is the second part after splitting, if it exists
        const whereClause = whereSplit.length > 1 ? whereSplit[1].trim() : null;

        // Split the remaining query at the JOIN clause if it exists
        const joinSplit = queryWithoutWhere.split(/\s(INNER|LEFT|RIGHT) JOIN\s/i);
        selectPart = joinSplit[0].trim(); // Everything before JOIN clause

        // JOIN clause is the second part after splitting, if it exists
        //const joinPart = joinSplit.length > 1 ? joinSplit[1].trim() : null;

        // Parse the SELECT part
        const selectRegex = /^SELECT\s(.+?)\sFROM\s(.+)/i;
        const selectMatch = selectPart.match(selectRegex);
        if (!selectMatch) {
            throw new Error('Invalid SELECT format');
        }

        const [, fields, table] = selectMatch;

        // Parse the JOIN part if it exists
        const { joinType, joinTable, joinCondition } = parseJoinClause(query);

        // Parse the WHERE part if it exists
        let whereClauses = [];
        if (whereClause) {
            whereClauses = parseWhereClause(whereClause);
        }

        const aggregateFunctionRegex = /(\bCOUNT\b|\bAVG\b|\bSUM\b|\bMIN\b|\bMAX\b)\s*\(\s*(\*|\w+)\s*\)/i;
        const hasAggregateWithoutGroupBy = aggregateFunctionRegex.test(query) && !groupByFields;

        return {
            fields: fields.split(',').map(field => field.trim()),
            table: table.trim(),
            whereClauses,
            joinType,
            joinTable,
            joinCondition,
            groupByFields,
            orderByFields,
            hasAggregateWithoutGroupBy,
            limit,
            isDistinct,
        };
    }catch(error) {
        console.log(error.message);
        throw new Error(`Query parsing error: ${error.message}`);
    }
    
}

// src/queryParser.js
function parseWhereClause(whereString) {
    const conditionRegex = /(.*?)(=|!=|>|<|>=|<=)(.*)/;
    return whereString.split(/ AND | OR /i).map(conditionString => {
        if (conditionString.includes(' LIKE ')) {
            const [field, pattern] = conditionString.split(/\sLIKE\s/i);
            return { field: field.trim(), operator: 'LIKE', value: pattern.trim().replace(/^'(.*)'$/, '$1') };
        } else {
            const match = conditionString.match(conditionRegex);
            if (match) {
                const [, field, operator, value] = match;
                return { field: field.trim(), operator, value: value.trim() };
            }
            throw new Error('Invalid WHERE clause format');
        }
    });
}

module.exports = { parseQuery, parseJoinClause };