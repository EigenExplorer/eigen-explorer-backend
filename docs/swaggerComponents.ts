// EntityMetadata
/**
 * @swagger
 * components:
 *  schemas:
 *    EntityMetadata:
 *      type: object
 *      properties:
 *        name:
 *          type: string
 *          description: Name of the entity.
 *        description:
 *          type: string
 *          description: Description of the entity.
 *        discord:
 *          type: string
 *          description: Optional Discord contact.
 *          nullable: true
 *        logo:
 *          type: string
 *          description: Optional logo URL.
 *          nullable: true
 *        telegram:
 *          type: string
 *          description: Optional Telegram contact.
 *          nullable: true
 *        website:
 *          type: string
 *          description: Optional website URL.
 *          nullable: true
 *        x:
 *          type: string
 *          description: Additional optional field.
 *          nullable: true
 */

// Operator
/**
 * @swagger
 * components:
 *  schemas:
 *    AvsOperator:
 *      type: object
 *      properties:
 *        address:
 *          type: string
 *          description: Address of the AVS operator.
 *        isActive:
 *          type: boolean
 *          description: Indicates whether the operator is active.
 */

// AVS
/**
 * @swagger
 * components:
 *  schemas:
 *    AVS:
 *      type: object
 *      required:
 *        - id
 *        - address
 *        - metadata
 *      properties:
 *        id:
 *          type: string
 *          description: The unique identifier for the AVS.
 *        address:
 *          type: string
 *          description: The unique address of the AVS.
 *        metadata:
 *          $ref: '#/components/schemas/EntityMetadata'
 *          description: Metadata associated with the AVS.
 *        curatedMetadata:
 *          $ref: '#/components/schemas/EntityMetadata'
 *          description: Curated metadata, optionally provided for the AVS.
 *          nullable: true
 *        tags:
 *          type: array
 *          items:
 *            type: string
 *          description: Tags associated with the AVS.
 *        isVisible:
 *          type: boolean
 *          description: Visibility status of the AVS.
 *        isVerified:
 *          type: boolean
 *          description: Verification status of the AVS.
 *        operators:
 *          type: array
 *          items:
 *            $ref: '#/components/schemas/AvsOperator'
 *          description: List of operators associated with this AVS.
 */
